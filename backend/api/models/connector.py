import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from api.core.db import Base


class Connector(Base):
	__tablename__ = "connectors"
	__table_args__ = (UniqueConstraint("user_id", "platform", name="uq_connectors_user_platform"),)

	id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
	user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	platform: Mapped[str] = mapped_column(Text, nullable=False, index=True)
	platform_email: Mapped[str | None] = mapped_column(Text, nullable=True)
	encrypted_access_token: Mapped[str] = mapped_column(Text, nullable=False)
	encrypted_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
	token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	status: Mapped[str] = mapped_column(Text, nullable=False, default="connected", server_default="connected")
	sync_cursor: Mapped[str | None] = mapped_column(Text, nullable=True)
	last_synced: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
	error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
	metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict, server_default="{}")
	created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		server_default=func.now(),
		onupdate=func.now(),
		nullable=False,
	)

