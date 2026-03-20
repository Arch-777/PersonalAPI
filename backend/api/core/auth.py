import uuid
import hashlib
from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.db import get_db, set_db_current_user
from api.core.security import decode_access_token, ensure_required_scope
from api.models.api_key import ApiKey
from api.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def _hash_api_key(raw_key: str) -> str:
	return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _required_scope_for_rest_path(path: str, method: str) -> str | None:
	"""Map REST routes to API-key scopes for API-key authenticated requests."""
	normalized = (path or "").strip().lower()
	normalized_method = (method or "").strip().upper()

	if normalized.startswith("/v1/search"):
		return "data.read"
	if normalized.startswith("/v1/emails"):
		return "data.read"
	if normalized.startswith("/v1/documents"):
		return "data.read"

	if normalized.startswith("/v1/connectors"):
		if normalized_method == "GET":
			return "connectors.read"
		if normalized_method in {"POST", "PATCH", "DELETE"}:
			return "connectors.write"

	if normalized.startswith("/v1/developer/api-keys"):
		if normalized_method == "GET":
			return "keys.read"
		if normalized_method == "POST":
			return "keys.write"

	if normalized.startswith("/v1/developer/analytics") and normalized_method == "GET":
		return "analytics.read"

	return None


def _resolve_user_from_jwt(token: str, db: Session) -> User:
	try:
		payload = decode_access_token(token)
	except ValueError:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

	user_id = payload.get("sub")
	if not user_id:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

	try:
		parsed_user_id = uuid.UUID(user_id)
	except ValueError:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

	set_db_current_user(db, parsed_user_id)

	user = db.execute(select(User).where(User.id == parsed_user_id)).scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
	return user


def _resolve_user_from_api_key(raw_api_key: str, db: Session, required_scope: str | None) -> User:
	now = datetime.now(UTC)
	key_hash = _hash_api_key(raw_api_key.strip())
	api_key = db.execute(
		select(ApiKey).where(
			ApiKey.key_hash == key_hash,
			ApiKey.revoked_at.is_(None),
		)
	).scalar_one_or_none()
	if api_key is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
	if api_key.expires_at is not None and api_key.expires_at <= now:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired API key")

	if required_scope:
		ensure_required_scope(getattr(api_key, "scopes", []), required_scope)

	set_db_current_user(db, api_key.user_id)
	user = db.execute(select(User).where(User.id == api_key.user_id)).scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
	return user


def get_current_user(
	request: Request,
	credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
	x_api_key: str | None = Header(default=None),
	db: Session = Depends(get_db),
) -> User:
	if credentials is not None:
		user = _resolve_user_from_jwt(credentials.credentials, db)
		request.state.auth_user_id = str(user.id)
		request.state.auth_api_key_id = None
		request.state.auth_method = "jwt"
		return user

	header_api_key = (x_api_key or "").strip()
	if header_api_key:
		required_scope = _required_scope_for_rest_path(request.url.path, request.method)
		user = _resolve_user_from_api_key(header_api_key, db, required_scope)
		request.state.auth_user_id = str(user.id)
		request.state.auth_method = "api_key"
		api_key = db.execute(select(ApiKey.id).where(ApiKey.key_hash == _hash_api_key(header_api_key))).scalar_one_or_none()
		request.state.auth_api_key_id = str(api_key) if api_key else None
		return user

	raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

