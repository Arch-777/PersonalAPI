from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from api.core.config import get_settings


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
	subject: str,
	expires_minutes: int | None = None,
	extra_claims: dict | None = None,
) -> str:
	expire_delta = timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
	expire_at = datetime.now(UTC) + expire_delta
	payload = {"sub": subject, "exp": expire_at}
	if extra_claims:
		payload.update(extra_claims)
	return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
	try:
		return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
	except JWTError as exc:
		raise ValueError("Invalid token") from exc


def normalize_scopes(scopes: list[str] | None) -> list[str]:
	"""Normalize scope list by trimming, lowering, and deduplicating while preserving order."""
	if not scopes:
		return []

	seen: set[str] = set()
	normalized: list[str] = []
	for raw in scopes:
		scope = raw.strip().lower()
		if not scope or scope in seen:
			continue
		seen.add(scope)
		normalized.append(scope)
	return normalized


def has_required_scope(scopes: list[str] | None, required_scope: str) -> bool:
	"""Return True when the API key satisfies required scope.

	Legacy compatibility: keys without any stored scopes are treated as full-access
	until scope migration and key rotation are completed.
	"""
	normalized_required = required_scope.strip().lower()
	if not normalized_required:
		return True

	normalized_scopes = normalize_scopes(scopes)
	if not normalized_scopes:
		return True
	if "*" in normalized_scopes:
		return True
	return normalized_required in normalized_scopes


def ensure_required_scope(scopes: list[str] | None, required_scope: str) -> None:
	if not has_required_scope(scopes=scopes, required_scope=required_scope):
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail=f"API key missing required scope: {required_scope}",
		)

