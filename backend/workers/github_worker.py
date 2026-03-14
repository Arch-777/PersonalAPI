from __future__ import annotations

from typing import Any

from workers.celery_app import celery_app
from workers.connector_sync import run_connector_sync


@celery_app.task(name="workers.github_worker.sync_github", bind=True)
def sync_github(self, connector_id: str, user_id: str, cursor: str | None = None) -> dict[str, Any]:
    return run_connector_sync(platform="github", connector_id=connector_id, user_id=user_id, cursor=cursor)
