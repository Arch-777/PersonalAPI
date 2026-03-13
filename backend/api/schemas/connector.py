from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ConnectorResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: str
	platform: str
	platform_email: str | None = None
	status: str
	last_synced: datetime | None = None
	error_message: str | None = None
	metadata: dict[str, Any] = Field(default_factory=dict)
	created_at: datetime
	updated_at: datetime


class ConnectorSyncResponse(BaseModel):
	status: str
	platform: str

