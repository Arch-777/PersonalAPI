from fastapi.testclient import TestClient

from mcp import server as mcp_server


app = mcp_server.app


def test_mcp_health_endpoint_returns_ok():
	with TestClient(app) as client:
		response = client.get("/health")

	assert response.status_code == 200
	assert response.json() == {"status": "ok", "service": "mcp"}


def test_mcp_rpc_initialize_returns_protocol_info():
	with TestClient(app) as client:
		response = client.post(
			"/rpc",
			json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
		)

	assert response.status_code == 200
	body = response.json()
	assert body["jsonrpc"] == "2.0"
	assert body["id"] == 1
	assert body["result"]["protocolVersion"] == "2024-11-05"
	assert body["result"]["serverInfo"]["name"] == "personalapi-mcp"


def test_mcp_rpc_tools_list_returns_tool_catalog():
	with TestClient(app) as client:
		response = client.post(
			"/rpc",
			json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
		)

	assert response.status_code == 200
	body = response.json()
	assert body["id"] == 2
	tools = body["result"]["tools"]
	assert isinstance(tools, list)
	assert any(tool["name"] == "search" for tool in tools)


def test_mcp_rpc_tools_call_accepts_bearer_key(monkeypatch):
	def fake_dispatch(tool_name: str, tool_args: dict, api_key: str):
		return {
			"tool": tool_name,
			"arguments": tool_args,
			"api_key": api_key,
		}

	monkeypatch.setattr(mcp_server, "_dispatch_tool", fake_dispatch)

	with TestClient(app) as client:
		response = client.post(
			"/rpc",
			headers={"Authorization": "Bearer pk_live_test_key"},
			json={
				"jsonrpc": "2.0",
				"id": 3,
				"method": "tools/call",
				"params": {
					"name": "search",
					"arguments": {"query": "budget"},
				},
			},
		)

	assert response.status_code == 200
	body = response.json()
	assert body["id"] == 3
	assert body["result"]["isError"] is False
	json_content = next(entry for entry in body["result"]["content"] if entry["type"] == "json")
	assert json_content["json"]["tool"] == "search"
	assert json_content["json"]["api_key"] == "pk_live_test_key"


def test_mcp_manifest_advertises_sse_transport():
	with TestClient(app) as client:
		response = client.get("/manifest")

	assert response.status_code == 200
	body = response.json()
	assert "sse" in body["transports"]
	assert body["endpoints"]["sse"] == "/sse"


def test_mcp_sse_message_unknown_session_returns_404():
	with TestClient(app) as client:
		response = client.post(
			"/message?session_id=missing-session",
			json={"jsonrpc": "2.0", "id": 10, "method": "initialize", "params": {}},
		)

	assert response.status_code == 404
	assert response.json()["detail"] == "Unknown or expired SSE session"


def test_mcp_sse_message_enqueues_rpc_response(monkeypatch):
	async def fake_get_queue(_session_id: str):
		class _Queue:
			def __init__(self):
				self.message = None

			async def put(self, data):
				self.message = data

		queue = _Queue()
		fake_get_queue.queue = queue
		return queue

	def fake_handle(body, x_api_key, authorization):
		return mcp_server.JsonRpcResponse(jsonrpc="2.0", id=body.id, result={"ok": True})

	monkeypatch.setattr(mcp_server, "_get_sse_session_queue", fake_get_queue)
	monkeypatch.setattr(mcp_server, "_handle_jsonrpc_request", fake_handle)

	with TestClient(app) as client:
		response = client.post(
			"/message?session_id=test-session",
			headers={"X-API-Key": "pk_live_x"},
			json={"jsonrpc": "2.0", "id": 11, "method": "ping", "params": {}},
		)

	assert response.status_code == 200
	body = response.json()
	assert body["accepted"] is True
	assert body["session_id"] == "test-session"
	assert body["id"] == 11

	enqueued = fake_get_queue.queue.message
	assert enqueued["event"] == "message"
	assert enqueued["data"]["id"] == 11
