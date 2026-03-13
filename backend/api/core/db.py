from collections.abc import Generator

from sqlalchemy import create_engine
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

