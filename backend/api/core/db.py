from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from api.core.config import get_settings


settings = get_settings()

engine = create_engine(
	settings.database_url,
	pool_pre_ping=True,
	connect_args={
		"sslmode": settings.database_ssl_mode,
		"connect_timeout": settings.database_connect_timeout,
	},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


class Base(DeclarativeBase):
	pass


def get_db() -> Generator[Session, None, None]:
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


def check_database_connection() -> None:
	"""Validate database reachability; raise RuntimeError on failure."""
	try:
		with engine.connect() as conn:
			conn.execute(text("SELECT 1"))
	except SQLAlchemyError as exc:
		raise RuntimeError(f"Database connection failed: {exc}") from exc

