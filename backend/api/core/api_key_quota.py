from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select

from api.core.api_plans import get_plan_tier_spec
from api.core.db import SessionLocal
from api.models.api_key import ApiKey


@dataclass(frozen=True)
class ApiKeyQuotaResult:
    limit: int
    remaining: int
    reset_at: datetime
    consumed: bool


@dataclass(frozen=True)
class ApiKeyPolicyResult:
    requests_per_minute: int


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _compute_month_window(now: datetime) -> tuple[datetime, datetime]:
    start = datetime(now.year, now.month, 1, tzinfo=UTC)
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1, tzinfo=UTC)
    else:
        end = datetime(now.year, now.month + 1, 1, tzinfo=UTC)
    return start, end


def resolve_api_key_policy(raw_api_key: str) -> ApiKeyPolicyResult:
    """Resolve plan-derived API key policy (for example RPM) with key validity checks."""
    key_hash = _hash_api_key(raw_api_key.strip())
    now = datetime.now(UTC)
    db = SessionLocal()

    try:
        row = db.execute(
            select(ApiKey).where(ApiKey.key_hash == key_hash)
        ).scalar_one_or_none()

        if row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        if row.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Revoked API key")
        if row.expires_at is not None and row.expires_at <= now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired API key")

        plan_tier = (getattr(row, "plan_tier", "") or "free").strip().lower()
        plan_spec = get_plan_tier_spec(plan_tier)
        return ApiKeyPolicyResult(requests_per_minute=int(plan_spec.requests_per_minute))
    finally:
        db.close()


def consume_monthly_quota(raw_api_key: str) -> ApiKeyQuotaResult:
    """Validate API key and atomically consume one monthly request quota unit."""
    key_hash = _hash_api_key(raw_api_key.strip())
    now = datetime.now(UTC)
    db = SessionLocal()

    try:
        row = db.execute(
            select(ApiKey)
            .where(ApiKey.key_hash == key_hash)
            .with_for_update()
        ).scalar_one_or_none()

        if row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        if row.revoked_at is not None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Revoked API key")
        if row.expires_at is not None and row.expires_at <= now:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired API key")

        plan_tier = (getattr(row, "plan_tier", "") or "free").strip().lower()
        plan_spec = get_plan_tier_spec(plan_tier)

        configured_limit = int(getattr(row, "monthly_quota", 0) or 0)
        limit = configured_limit if configured_limit > 0 else int(plan_spec.monthly_quota)

        window_start = getattr(row, "quota_window_start", None)
        window_end = getattr(row, "quota_window_end", None)
        should_reset = (
            window_start is None
            or window_end is None
            or now >= window_end
        )
        if should_reset:
            window_start, window_end = _compute_month_window(now)
            row.quota_window_start = window_start
            row.quota_window_end = window_end
            row.quota_used = 0

        quota_used = int(getattr(row, "quota_used", 0) or 0)
        if quota_used >= limit:
            db.commit()
            return ApiKeyQuotaResult(limit=limit, remaining=0, reset_at=row.quota_window_end, consumed=False)

        row.quota_used = quota_used + 1
        row.last_used_at = now
        db.commit()

        remaining = max(0, limit - int(row.quota_used or 0))
        return ApiKeyQuotaResult(limit=limit, remaining=remaining, reset_at=row.quota_window_end, consumed=True)
    finally:
        db.close()
