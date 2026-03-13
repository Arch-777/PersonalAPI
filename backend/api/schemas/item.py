import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ItemResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: uuid.UUID
	type: str
	source: str
	source_id: str
	title: str | None = None
	sender_name: str | None = None
	sender_email: str | None = None
	content: str | None = None
	summary: str | None = None
	metadata: dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_json")
	item_date: datetime | None = None
	file_path: str | None = None
	created_at: datetime
	updated_at: datetime


class PaginatedItemsResponse(BaseModel):
	items: list[ItemResponse]
	total: int
	limit: int
	offset: int

