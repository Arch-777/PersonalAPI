import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
import math

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.api_plans import get_plan_tier_spec, list_plan_tiers
from api.core.auth import get_current_user
from api.core.db import get_db
from api.core.security import normalize_scopes
from api.models.access_log import AccessLog
from api.models.api_key import ApiKey
from api.models.user import User


router = APIRouter(prefix="/developer", tags=["developer"])


class ApiKeyCreateRequest(BaseModel):
	name: str | None = Field(default=None, max_length=120)
	plan_tier: str = Field(default="free")
	allowed_channels: list[str] = Field(default_factory=list)
	scopes: list[str] = Field(default_factory=list)
	agent_type: str | None = Field(default=None, max_length=50)
	expires_in_days: int | None = Field(default=None, ge=1, le=3650)
	expires_at: datetime | None = Field(default=None)

	@model_validator(mode="after")
	def validate_expiry_input(self):
		if self.expires_in_days is not None and self.expires_at is not None:
			raise ValueError("Provide either expires_in_days or expires_at, not both")
		self.plan_tier = self.plan_tier.strip().lower()
		if self.plan_tier not in set(list_plan_tiers()):
			allowed = ", ".join(list_plan_tiers())
			raise ValueError(f"Invalid plan_tier '{self.plan_tier}'. Allowed values: {allowed}")
		return self


class ApiKeyCreateResponse(BaseModel):
	id: str
	name: str | None
	key_prefix: str
	api_key: str
	plan_tier: str
	monthly_quota: int
	quota_used: int
	quota_window_start: datetime | None = None
	quota_window_end: datetime | None = None
	allowed_channels: list[str]
	scopes: list[str]
	agent_type: str | None
	created_at: datetime
	expires_at: datetime | None = None


class ApiKeyListItem(BaseModel):
	id: str
	name: str | None
	key_prefix: str
	plan_tier: str
	monthly_quota: int
	quota_used: int
	quota_window_start: datetime | None = None
	quota_window_end: datetime | None = None
	allowed_channels: list[str]
	scopes: list[str]
	agent_type: str | None
	created_at: datetime
	last_used_at: datetime | None = None
	expires_at: datetime | None = None
	revoked_at: datetime | None = None


class UsageSummaryResponse(BaseModel):
	window_days: int
	total_requests: int
	error_requests: int
	error_rate: float
	average_latency_ms: float | None = None
	p95_latency_ms: float | None = None


class TimeseriesPoint(BaseModel):
	bucket_start: datetime
	total_requests: int
	error_requests: int
	error_rate: float
	average_latency_ms: float | None = None


class UsageTimeseriesResponse(BaseModel):
	window_days: int
	granularity: str
	points: list[TimeseriesPoint]


class StatusBreakdownItem(BaseModel):
	status_bucket: str
	requests: int


class PathBreakdownItem(BaseModel):
	path: str
	total_requests: int
	error_requests: int
	error_rate: float
	average_latency_ms: float | None = None


class UsageBreakdownResponse(BaseModel):
	window_days: int
	status: list[StatusBreakdownItem]
	paths: list[PathBreakdownItem]


def _validate_window_days(window_days: int) -> None:
	if window_days < 1 or window_days > 90:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="window_days must be between 1 and 90")


def _load_usage_logs(db: Session, user_id: uuid.UUID, window_days: int) -> list[AccessLog]:
	window_start = datetime.now(UTC) - timedelta(days=window_days)
	return db.execute(
		select(AccessLog).where(
			AccessLog.user_id == user_id,
			AccessLog.created_at >= window_start,
		)
	).scalars().all()


def _to_utc(dt: datetime) -> datetime:
	if dt.tzinfo is None:
		return dt.replace(tzinfo=UTC)
	return dt.astimezone(UTC)


def _bucket_start_for(ts: datetime, granularity: str) -> datetime:
	if granularity == "hour":
		return ts.replace(minute=0, second=0, microsecond=0)
	return ts.replace(hour=0, minute=0, second=0, microsecond=0)


def _compute_usage_summary(db: Session, user_id: uuid.UUID, window_days: int) -> UsageSummaryResponse:
	logs = _load_usage_logs(db=db, user_id=user_id, window_days=window_days)

	total_requests = len(logs)
	error_requests = sum(1 for row in logs if int(row.status_code) >= 400)
	error_rate = (error_requests / total_requests) if total_requests > 0 else 0.0

	latencies = sorted(int(row.latency_ms) for row in logs if row.latency_ms is not None)
	average_latency_ms = (sum(latencies) / len(latencies)) if latencies else None
	p95_latency_ms: float | None = None
	if latencies:
		index = max(0, math.ceil(0.95 * len(latencies)) - 1)
		p95_latency_ms = float(latencies[index])

	return UsageSummaryResponse(
		window_days=window_days,
		total_requests=total_requests,
		error_requests=error_requests,
		error_rate=float(round(error_rate, 6)),
		average_latency_ms=float(round(average_latency_ms, 2)) if average_latency_ms is not None else None,
		p95_latency_ms=p95_latency_ms,
	)


def _compute_usage_timeseries(db: Session, user_id: uuid.UUID, window_days: int, granularity: str) -> UsageTimeseriesResponse:
	logs = _load_usage_logs(db=db, user_id=user_id, window_days=window_days)
	buckets: dict[datetime, list[AccessLog]] = {}

	for row in logs:
		if row.created_at is None:
			continue
		bucket_start = _bucket_start_for(_to_utc(row.created_at), granularity)
		buckets.setdefault(bucket_start, []).append(row)

	points: list[TimeseriesPoint] = []
	for bucket_start in sorted(buckets.keys()):
		entries = buckets[bucket_start]
		total_requests = len(entries)
		error_requests = sum(1 for entry in entries if int(entry.status_code) >= 400)
		error_rate = (error_requests / total_requests) if total_requests > 0 else 0.0
		latencies = [int(entry.latency_ms) for entry in entries if entry.latency_ms is not None]
		average_latency_ms = (sum(latencies) / len(latencies)) if latencies else None
		points.append(
			TimeseriesPoint(
				bucket_start=bucket_start,
				total_requests=total_requests,
				error_requests=error_requests,
				error_rate=float(round(error_rate, 6)),
				average_latency_ms=float(round(average_latency_ms, 2)) if average_latency_ms is not None else None,
			)
		)

	return UsageTimeseriesResponse(window_days=window_days, granularity=granularity, points=points)


def _compute_usage_breakdown(db: Session, user_id: uuid.UUID, window_days: int, top_paths: int) -> UsageBreakdownResponse:
	logs = _load_usage_logs(db=db, user_id=user_id, window_days=window_days)

	status_buckets: dict[str, int] = {}
	path_stats: dict[str, dict[str, float]] = {}

	for row in logs:
		status_bucket = f"{int(row.status_code) // 100}xx"
		status_buckets[status_bucket] = status_buckets.get(status_bucket, 0) + 1

		path = row.path or "unknown"
		stats = path_stats.setdefault(path, {"total": 0.0, "errors": 0.0, "latency_sum": 0.0, "latency_count": 0.0})
		stats["total"] += 1
		if int(row.status_code) >= 400:
			stats["errors"] += 1
		if row.latency_ms is not None:
			stats["latency_sum"] += float(row.latency_ms)
			stats["latency_count"] += 1

	status_items = [
		StatusBreakdownItem(status_bucket=bucket, requests=count)
		for bucket, count in sorted(status_buckets.items(), key=lambda item: item[0])
	]

	ordered_paths = sorted(path_stats.items(), key=lambda item: (int(item[1]["total"]), item[0]), reverse=True)
	path_items: list[PathBreakdownItem] = []
	for path, stats in ordered_paths[:top_paths]:
		total_requests = int(stats["total"])
		error_requests = int(stats["errors"])
		error_rate = (error_requests / total_requests) if total_requests > 0 else 0.0
		average_latency_ms = None
		if stats["latency_count"] > 0:
			average_latency_ms = float(round(stats["latency_sum"] / stats["latency_count"], 2))

		path_items.append(
			PathBreakdownItem(
				path=path,
				total_requests=total_requests,
				error_requests=error_requests,
				error_rate=float(round(error_rate, 6)),
				average_latency_ms=average_latency_ms,
			)
		)

	return UsageBreakdownResponse(window_days=window_days, status=status_items, paths=path_items)


def _hash_api_key(raw_key: str) -> str:
	return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


@router.post("/api-keys", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
	payload: ApiKeyCreateRequest,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> ApiKeyCreateResponse:
	now = datetime.now(UTC)
	expires_at = payload.expires_at
	if payload.expires_in_days is not None:
		expires_at = now + timedelta(days=payload.expires_in_days)

	if expires_at is not None:
		if expires_at.tzinfo is None:
			expires_at = expires_at.replace(tzinfo=UTC)
		if expires_at <= now:
			raise HTTPException(
				status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
				detail="expires_at must be in the future",
			)

	raw_key = f"pk_live_{secrets.token_urlsafe(32)}"
	key_prefix = raw_key[:14]
	key_hash = _hash_api_key(raw_key)
	normalized_scopes = normalize_scopes(payload.scopes)
	plan_spec = get_plan_tier_spec(payload.plan_tier)
	quota_window_start = datetime(now.year, now.month, 1, tzinfo=UTC)
	if now.month == 12:
		quota_window_end = datetime(now.year + 1, 1, 1, tzinfo=UTC)
	else:
		quota_window_end = datetime(now.year, now.month + 1, 1, tzinfo=UTC)

	api_key = ApiKey(
		user_id=current_user.id,
		name=payload.name,
		key_prefix=key_prefix,
		key_hash=key_hash,
		plan_tier=plan_spec.key,
		monthly_quota=plan_spec.monthly_quota,
		quota_used=0,
		quota_window_start=quota_window_start,
		quota_window_end=quota_window_end,
		allowed_channels=payload.allowed_channels,
		scopes=normalized_scopes,
		agent_type=payload.agent_type,
		expires_at=expires_at,
	)
	db.add(api_key)
	db.commit()
	db.refresh(api_key)

	return ApiKeyCreateResponse(
		id=str(api_key.id),
		name=api_key.name,
		key_prefix=api_key.key_prefix,
		api_key=raw_key,
		plan_tier=getattr(api_key, "plan_tier", "free"),
		monthly_quota=int(getattr(api_key, "monthly_quota", 0) or 0),
		quota_used=int(getattr(api_key, "quota_used", 0) or 0),
		quota_window_start=getattr(api_key, "quota_window_start", None),
		quota_window_end=getattr(api_key, "quota_window_end", None),
		allowed_channels=api_key.allowed_channels,
		scopes=normalize_scopes(getattr(api_key, "scopes", [])),
		agent_type=api_key.agent_type,
		created_at=api_key.created_at,
		expires_at=api_key.expires_at,
	)


@router.get("/api-keys", response_model=list[ApiKeyListItem])
def list_api_keys(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> list[ApiKeyListItem]:
	keys = db.execute(
		select(ApiKey)
		.where(ApiKey.user_id == current_user.id)
		.order_by(ApiKey.created_at.desc())
	).scalars().all()

	return [
		ApiKeyListItem(
			id=str(key.id),
			name=key.name,
			key_prefix=key.key_prefix,
			plan_tier=getattr(key, "plan_tier", "free"),
			monthly_quota=int(getattr(key, "monthly_quota", 0) or 0),
			quota_used=int(getattr(key, "quota_used", 0) or 0),
			quota_window_start=getattr(key, "quota_window_start", None),
			quota_window_end=getattr(key, "quota_window_end", None),
			allowed_channels=key.allowed_channels,
			scopes=normalize_scopes(getattr(key, "scopes", [])),
			agent_type=key.agent_type,
			created_at=key.created_at,
			last_used_at=key.last_used_at,
			expires_at=key.expires_at,
			revoked_at=key.revoked_at,
		)
		for key in keys
	]


@router.post("/api-keys/{api_key_id}/revoke", response_model=ApiKeyListItem)
def revoke_api_key(
	api_key_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> ApiKeyListItem:
	try:
		key_uuid = uuid.UUID(api_key_id)
	except ValueError:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid API key id")

	api_key = db.execute(
		select(ApiKey).where(ApiKey.id == key_uuid, ApiKey.user_id == current_user.id)
	).scalar_one_or_none()
	if api_key is None:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

	api_key.revoked_at = datetime.now(UTC)
	db.add(api_key)
	db.commit()
	db.refresh(api_key)

	return ApiKeyListItem(
		id=str(api_key.id),
		name=api_key.name,
		key_prefix=api_key.key_prefix,
		plan_tier=getattr(api_key, "plan_tier", "free"),
		monthly_quota=int(getattr(api_key, "monthly_quota", 0) or 0),
		quota_used=int(getattr(api_key, "quota_used", 0) or 0),
		quota_window_start=getattr(api_key, "quota_window_start", None),
		quota_window_end=getattr(api_key, "quota_window_end", None),
		allowed_channels=api_key.allowed_channels,
		scopes=normalize_scopes(getattr(api_key, "scopes", [])),
		agent_type=api_key.agent_type,
		created_at=api_key.created_at,
		last_used_at=api_key.last_used_at,
		expires_at=api_key.expires_at,
		revoked_at=api_key.revoked_at,
	)


@router.get("/analytics/summary", response_model=UsageSummaryResponse)
def usage_summary(
	window_days: int = 30,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> UsageSummaryResponse:
	_validate_window_days(window_days)
	return _compute_usage_summary(db=db, user_id=current_user.id, window_days=window_days)


@router.get("/analytics/timeseries", response_model=UsageTimeseriesResponse)
def usage_timeseries(
	window_days: int = 30,
	granularity: str = "day",
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> UsageTimeseriesResponse:
	_validate_window_days(window_days)
	granularity_normalized = (granularity or "day").strip().lower()
	if granularity_normalized not in {"hour", "day"}:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="granularity must be one of: hour, day")
	return _compute_usage_timeseries(
		db=db,
		user_id=current_user.id,
		window_days=window_days,
		granularity=granularity_normalized,
	)


@router.get("/analytics/breakdown", response_model=UsageBreakdownResponse)
def usage_breakdown(
	window_days: int = 30,
	top_paths: int = 10,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> UsageBreakdownResponse:
	_validate_window_days(window_days)
	if top_paths < 1 or top_paths > 50:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="top_paths must be between 1 and 50")
	return _compute_usage_breakdown(db=db, user_id=current_user.id, window_days=window_days, top_paths=top_paths)

