from fastapi import APIRouter, Depends, Query
from sqlalchemy import Float, case, cast, func, or_, select
from sqlalchemy.orm import Session

from api.core.auth import get_current_user
from api.core.db import get_db
from api.models.item import Item
from api.models.user import User
from api.schemas.search import SearchResponse, SearchResult


router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=SearchResponse)
def semantic_search(
	q: str = Query(min_length=1, max_length=2000),
	top_k: int = Query(default=10, ge=1, le=50),
	type_filter: str | None = Query(default=None),
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
) -> SearchResponse:
	search_term = q.strip()
	like_term = f"%{search_term}%"

	score_expr = case(
		(func.similarity(func.coalesce(Item.title, ""), search_term) > 0, func.similarity(func.coalesce(Item.title, ""), search_term) * 1.5),
		else_=0,
	) + case(
		(func.similarity(func.coalesce(Item.content, ""), search_term) > 0, func.similarity(func.coalesce(Item.content, ""), search_term)),
		else_=0,
	)

	filters = [
		Item.user_id == current_user.id,
		or_(
			Item.title.ilike(like_term),
			Item.content.ilike(like_term),
			Item.summary.ilike(like_term),
		),
	]
	if type_filter:
		filters.append(Item.type == type_filter)

	rows = db.execute(
		select(
			Item.id,
			Item.type,
			Item.source,
			Item.summary,
			Item.content,
			Item.metadata_json.label("metadata"),
			Item.item_date,
			cast(score_expr, Float).label("score"),
		)
		.where(*filters)
		.order_by(score_expr.desc(), Item.item_date.desc().nullslast(), Item.created_at.desc())
		.limit(top_k)
	).all()

	results = [
		SearchResult(
			id=str(row.id),
			type=row.type,
			source=row.source,
			preview=(row.summary or row.content or "")[:300],
			score=float(row.score or 0.0),
			metadata=row.metadata or {},
			item_date=row.item_date,
		)
		for row in rows
	]

	return SearchResponse(query=search_term, results=results, count=len(results))

