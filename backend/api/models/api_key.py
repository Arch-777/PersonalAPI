import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from api.core.db import Base


class ApiKey(Base):
	__tablename__ = "api_keys"

	id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	key_prefix: Mapped[str] = mapped_column(Text, nullable=False)
	key_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
	name: Mapped[str | None] = mapped_column(Text, nullable=True)
	agent_type: Mapped[str | None] = mapped_column(Text, nullable=True)
	allowed_channels: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
	scopes: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
	plan_tier: Mapped[str] = mapped_column(Text, nullable=False, default="free", server_default="free")
	monthly_quota: Mapped[int] = mapped_column(Integer, nullable=False, default=5000, server_default="5000")
	quota_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
	quota_window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	quota_window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

