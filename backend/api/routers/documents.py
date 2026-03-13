from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from api.core.auth import get_current_user
from api.core.db import get_db
from api.models.item import Item
from api.models.user import User
from api.schemas.item import ItemResponse, PaginatedItemsResponse


router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=PaginatedItemsResponse)
def list_documents(
	limit: int = Query(default=20, ge=1, le=100),
	offset: int = Query(default=0, ge=0),
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> PaginatedItemsResponse:
	base_filters = (
		Item.user_id == current_user.id,
		or_(
			Item.type.in_(["document", "file", "note", "page"]),
			Item.source.in_(["drive", "notion"]),
		),
	)

	total = db.scalar(select(func.count()).select_from(Item).where(*base_filters)) or 0
	items = db.execute(
		select(Item)
		.where(*base_filters)
		.order_by(Item.item_date.desc().nullslast(), Item.created_at.desc())
		.offset(offset)
		.limit(limit)
	).scalars().all()

	return PaginatedItemsResponse(
		items=[ItemResponse.model_validate(item) for item in items],
		total=total,
		limit=limit,
		offset=offset,
	)

