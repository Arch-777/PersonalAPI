import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from api.core.db import Base


class AccessLog(Base):
	__tablename__ = "access_logs"

	id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
	api_key_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True, index=True)
	request_id: Mapped[str | None] = mapped_column(Text, nullable=True)
	method: Mapped[str] = mapped_column(Text, nullable=False)
	path: Mapped[str] = mapped_column(Text, nullable=False)
	status_code: Mapped[int] = mapped_column(Integer, nullable=False)
	latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
	client_ip: Mapped[str | None] = mapped_column(Text, nullable=True)
	user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

