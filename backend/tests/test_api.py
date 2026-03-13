import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

from fastapi.testclient import TestClient

from api.core.auth import get_current_user
from api.core.db import get_db
from api.main import app
from api.models.user import User


class _FakeScalarResult:
	def __init__(self, rows):
		self._rows = rows

	def all(self):
		return self._rows


class _FakeResult:
	def __init__(self, rows=None, one=None):
		self._rows = rows or []
		self._one = one

	def scalars(self):
		return _FakeScalarResult(self._rows)

	def scalar_one_or_none(self):
		return self._one


class FakeDb:
	def __init__(self):
		self.items = []
		self.api_keys = []
		self.next_scalar = None
		self.next_rows = []
		self.next_one = None

	def scalar(self, _stmt):
		return self.next_scalar

	def execute(self, _stmt):
		return _FakeResult(rows=self.next_rows, one=self.next_one)

	def add(self, obj):
		if getattr(obj, "id", None) is None:
			obj.id = uuid.uuid4()
		if getattr(obj, "created_at", None) is None:
			obj.created_at = datetime.now(UTC)
		self.api_keys.append(obj)

	def commit(self):
		return None

	def refresh(self, _obj):
		return None


def _override_user() -> User:
	return SimpleNamespace(id=uuid.uuid4())


def _build_item(item_type: str, source: str) -> SimpleNamespace:
	now = datetime.now(UTC)
	return SimpleNamespace(
		id=uuid.uuid4(),
		type=item_type,
		source=source,
		source_id=f"{source}-1",
		title="Sample",
		sender_name="Sender",
		sender_email="sender@example.com",
		content="Example content",
		summary="Example summary",
		metadata_json={"k": "v"},
		item_date=now,
		file_path="/tmp/file.json",
		created_at=now,
		updated_at=now,
	)


def test_health_endpoint_returns_ok():
	client = TestClient(app)
	response = client.get("/health")

	assert response.status_code == 200
	assert response.json() == {"status": "ok"}


def test_emails_endpoint_returns_paginated_items():
	fake_db = FakeDb()
	fake_db.next_scalar = 1
	fake_db.next_rows = [_build_item("email", "gmail")]

	app.dependency_overrides[get_db] = lambda: fake_db
	app.dependency_overrides[get_current_user] = _override_user

	client = TestClient(app)
	response = client.get("/v1/emails/?limit=10&offset=0")

	assert response.status_code == 200
	body = response.json()
	assert body["total"] == 1
	assert body["limit"] == 10
	assert len(body["items"]) == 1
	assert body["items"][0]["type"] == "email"

	app.dependency_overrides.clear()


def test_documents_endpoint_returns_paginated_items():
	fake_db = FakeDb()
	fake_db.next_scalar = 1
	fake_db.next_rows = [_build_item("document", "drive")]

	app.dependency_overrides[get_db] = lambda: fake_db
	app.dependency_overrides[get_current_user] = _override_user

	client = TestClient(app)
	response = client.get("/v1/documents/?limit=10&offset=0")

	assert response.status_code == 200
	body = response.json()
	assert body["total"] == 1
	assert body["items"][0]["source"] == "drive"

	app.dependency_overrides.clear()


def test_developer_create_and_list_api_keys():
	fake_db = FakeDb()
	created = SimpleNamespace(
		id=uuid.uuid4(),
		name="local key",
		key_prefix="pk_live_123456",
		allowed_channels=["telegram"],
		agent_type="openclaw",
		created_at=datetime.now(UTC),
		last_used_at=None,
		expires_at=None,
		revoked_at=None,
	)
	fake_db.next_rows = [created]

	app.dependency_overrides[get_db] = lambda: fake_db
	app.dependency_overrides[get_current_user] = _override_user

	client = TestClient(app)
	create_resp = client.post(
		"/v1/developer/api-keys",
		json={"name": "local key", "allowed_channels": ["telegram"], "agent_type": "openclaw"},
	)
	assert create_resp.status_code == 201
	assert create_resp.json()["api_key"].startswith("pk_live_")

	list_resp = client.get("/v1/developer/api-keys")
	assert list_resp.status_code == 200
	assert len(list_resp.json()) >= 1

	app.dependency_overrides.clear()


def test_developer_revoke_api_key_success():
	fake_db = FakeDb()
	key_id = uuid.uuid4()
	record = SimpleNamespace(
		id=key_id,
		name="revokable",
		key_prefix="pk_live_123456",
		allowed_channels=[],
		agent_type=None,
		created_at=datetime.now(UTC),
		last_used_at=None,
		expires_at=None,
		revoked_at=None,
	)
	fake_db.next_one = record

	app.dependency_overrides[get_db] = lambda: fake_db
	app.dependency_overrides[get_current_user] = _override_user

	client = TestClient(app)
	resp = client.post(f"/v1/developer/api-keys/{key_id}/revoke")

	assert resp.status_code == 200
	assert resp.json()["revoked_at"] is not None

	app.dependency_overrides.clear()

