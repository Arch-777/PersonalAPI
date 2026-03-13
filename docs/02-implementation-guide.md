# 🔧 PersonalAPI — Implementation Guide

> **Version:** 2.0 · **Updated:** 2026-03-13
>
> Step-by-step implementation guide covering backend, frontend, RAG pipeline, and data flow.

---

## Table of Contents

- [1. Backend Implementation](#1-backend-implementation)
- [2. Data Flow Pipeline](#2-data-flow-pipeline)
- [3. RAG Pipeline Implementation](#3-rag-pipeline-implementation)
- [4. Frontend Implementation](#4-frontend-implementation)
- [5. WebSocket Implementation](#5-websocket-implementation)
- [6. MCP Server Implementation](#6-mcp-server-implementation)
- [7. OpenClaw Integration](#7-openclaw-integration)

---

## 1. Backend Implementation

### Project Structure

```
personalapi/
├── api/
│   ├── main.py                  ← FastAPI app entry point
│   ├── routers/
│   │   ├── auth.py              ← OAuth + JWT login/register
│   │   ├── emails.py            ← GET /v1/emails
│   │   ├── documents.py         ← GET /v1/documents
│   │   ├── search.py            ← GET /v1/search (semantic)
│   │   ├── connectors.py        ← Service connection management
│   │   ├── developer.py         ← API key generation
│   │   ├── chat.py              ← Chatbot endpoint
│   │   └── ws.py                ← WebSocket handler
│   ├── models/
│   │   ├── user.py              ← User ORM model
│   │   ├── connector.py         ← Connector ORM model
│   │   ├── item.py              ← Unified items table
│   │   ├── api_key.py           ← Developer API keys
│   │   ├── chat_session.py      ← Chat conversation history
│   │   └── access_log.py        ← Audit log
│   ├── schemas/
│   │   ├── auth.py              ← Login/register Pydantic schemas
│   │   ├── item.py              ← Item request/response schemas
│   │   ├── search.py            ← Search query/result schemas
│   │   ├── connector.py         ← Connector schemas
│   │   └── chat.py              ← Chat message schemas
│   └── core/
│       ├── config.py            ← Settings from .env
│       ├── db.py                ← SQLAlchemy session factory
│       ├── auth.py              ← get_current_user dependency
│       └── security.py          ← Fernet encrypt/decrypt + SHA-256
├── workers/
│   ├── celery_app.py            ← Celery config + beat schedule
│   ├── whatsapp_worker.py
│   ├── google_worker.py
│   ├── notion_worker.py
│   ├── spotify_worker.py
│   ├── embedding_worker.py
│   └── file_watcher_worker.py
├── normalizer/
│   ├── base.py                  ← Abstract BaseNormalizer
│   ├── gmail.py
│   ├── drive.py
│   ├── gcal.py
│   ├── whatsapp.py
│   ├── notion.py
│   └── spotify.py
├── rag/
│   ├── chunker.py               ← Document chunking logic
│   ├── embedder.py              ← Embedding generation
│   ├── retriever.py             ← Vector search + re-ranking
│   ├── context.py               ← Context assembly for LLM
│   └── engine.py                ← RAG query orchestrator
├── mcp/
│   └── server.py                ← MCP tool server
├── migrations/
│   └── 001_initial.sql
├── tests/
│   ├── test_normalizers.py
│   ├── test_api.py
│   ├── test_search.py
│   └── test_rag.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

### FastAPI App Entry Point

```python
# api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import auth, emails, documents, search, connectors, developer, chat, ws

app = FastAPI(title="PersonalAPI", description="Your personal data, unified.", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(auth.router)
app.include_router(emails.router, prefix="/v1")
app.include_router(documents.router, prefix="/v1")
app.include_router(search.router, prefix="/v1")
app.include_router(connectors.router, prefix="/v1")
app.include_router(developer.router, prefix="/v1")
app.include_router(chat.router, prefix="/v1")
app.include_router(ws.router)
```

### Database Schema — Extended

Building on the dev-reference schema, add these tables for chat and OpenClaw:

```sql
-- Chat conversation history
CREATE TABLE chat_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel       TEXT NOT NULL DEFAULT 'dashboard',  -- 'dashboard' | 'telegram' | 'whatsapp'
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role          TEXT NOT NULL,                       -- 'user' | 'assistant'
    content       TEXT NOT NULL,
    sources       JSONB DEFAULT '[]',                  -- cited items/documents
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- OpenClaw tokens (extends api_keys with agent-specific fields)
ALTER TABLE api_keys ADD COLUMN agent_type TEXT DEFAULT NULL;  -- 'openclaw' | NULL
ALTER TABLE api_keys ADD COLUMN allowed_channels TEXT[] DEFAULT '{}';  -- ['telegram', 'whatsapp']
```

### Connector Management Endpoint

```python
# api/routers/connectors.py
router = APIRouter(prefix="/connectors", tags=["connectors"])

@router.get("/")
def list_connectors(user=Depends(get_current_user), db=Depends(get_db)):
    """List all connected services for the current user."""
    connectors = db.query(Connector).filter(Connector.user_id == user.id).all()
    return [
        {
            "id": str(c.id),
            "platform": c.platform,
            "platform_email": c.platform_email,
            "status": c.status,
            "last_synced": c.last_synced,
            "error_message": c.error_message,
        }
        for c in connectors
    ]

@router.post("/{platform}/sync")
def trigger_sync(platform: str, user=Depends(get_current_user), db=Depends(get_db)):
    """Manually trigger a sync for a specific service."""
    connector = db.query(Connector).filter(
        Connector.user_id == user.id, Connector.platform == platform
    ).first()
    if not connector:
        raise HTTPException(404, f"No {platform} connector found")

    # Dispatch to the appropriate worker queue
    worker_map = {
        "gmail": "workers.google_worker.sync_gmail",
        "drive": "workers.google_worker.sync_drive",
        "whatsapp": "workers.whatsapp_worker.sync_whatsapp",
        "notion": "workers.notion_worker.sync_notion",
        "spotify": "workers.spotify_worker.sync_spotify",
    }
    task_name = worker_map.get(platform)
    if task_name:
        from celery import current_app
        current_app.send_task(task_name, args=[str(user.id), str(connector.id)])

    return {"status": "sync_queued", "platform": platform}

@router.delete("/{platform}")
def disconnect_service(platform: str, user=Depends(get_current_user), db=Depends(get_db)):
    """Disconnect a service and remove stored credentials."""
    connector = db.query(Connector).filter(
        Connector.user_id == user.id, Connector.platform == platform
    ).first()
    if connector:
        db.delete(connector)
        db.commit()
    return {"status": "disconnected", "platform": platform}
```

### Chatbot Endpoint

```python
# api/routers/chat.py
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/message")
async def chat_message(
    message: str,
    session_id: str = None,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Send a message to the RAG-powered chatbot."""
    from rag.engine import RAGEngine
    engine = RAGEngine(db, user.id)

    # Create or resume session
    if not session_id:
        session = ChatSession(user_id=user.id, channel="dashboard")
        db.add(session)
        db.commit()
        session_id = str(session.id)

    # Save user message
    user_msg = ChatMessage(session_id=session_id, role="user", content=message)
    db.add(user_msg)

    # Run RAG pipeline
    result = await engine.query(message)

    # Save assistant response
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=result["answer"],
        sources=result["sources"]
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "session_id": session_id,
        "answer": result["answer"],
        "sources": result["sources"],
        "documents": result.get("documents", []),
        "file_links": result.get("file_links", []),
    }
```

---

## 2. Data Flow Pipeline

The complete journey of data from external service to chatbot response:

```
┌──────────────────┐
│ External Service │  (Gmail, WhatsApp, Notion, Spotify, etc.)
│  (API endpoint)  │
└────────┬─────────┘
         │  OAuth / Token auth
         ▼
┌──────────────────┐
│  Celery Worker   │  workers/{service}_worker.py
│  Fetches data    │  Paginated, with sync_cursor
│  via API calls   │  Auto-refreshes expired tokens
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Normalizer      │  normalizer/{service}.py
│  Converts raw    │  extends BaseNormalizer
│  data to unified │  { type, source, source_id, content, metadata }
│  schema          │
└────────┬─────────┘
         │
         ├──────────────────────────────┐
         ▼                              ▼
┌──────────────────┐    ┌──────────────────────────┐
│  User Data       │    │  PostgreSQL               │
│  Filesystem      │    │  items table              │
│  /users/{id}/    │    │  UPSERT (deduplication)   │
│  data/{service}/ │    │  via UNIQUE constraint    │
└────────┬─────────┘    └──────────┬───────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────────┐
│  File Watcher    │    │  Embedding Worker         │
│  Detects new     │    │  text-embedding-3-small   │
│  files           │    │  Batch up to 2048 items   │
└────────┬─────────┘    └──────────┬───────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────────┐
│  Redis Pub/Sub   │    │  pgvector                 │
│  Notify clients  │    │  Stores 1536-dim vectors  │
└────────┬─────────┘    │  IVFFlat index (10K+ rows)│
         │              └──────────┬───────────────┘
         ▼                         │
┌──────────────────┐               │
│  WebSocket Push  │               │
│  Dashboard live  │               ▼
│  updates         │    ┌──────────────────────────┐
└──────────────────┘    │  RAG Query Engine         │
                        │  Cosine similarity search │
                        │  Context assembly         │
                        └──────────┬───────────────┘
                                   │
                                   ▼
                        ┌──────────────────────────┐
                        │  Chatbot / Search API     │
                        │  Text + sources + links   │
                        └──────────────────────────┘
```

### Data Processing Rules

| Stage | Key Rule |
|---|---|
| **Fetch** | Always paginate. Save `sync_cursor` after each page for crash recovery. |
| **Normalize** | All normalizers output the same schema. Never store raw platform data in `items`. |
| **Store** | Write individual JSON files. Use deterministic filenames to prevent duplicates. |
| **Upsert** | `UNIQUE(user_id, source, source_id)` constraint handles idempotent re-syncs. |
| **Embed** | Never in the API path. Always async via `embed_pending_items` worker. |
| **Index** | IVFFlat index only after 10K+ rows. Full table scan is faster with fewer rows. |

---

## 3. RAG Pipeline Implementation

### Core RAG Module

```
rag/
├── chunker.py       ← Splits documents into embeddable chunks
├── embedder.py      ← Calls OpenAI embedding API
├── retriever.py     ← pgvector cosine similarity search
├── context.py       ← Builds LLM prompt from retrieved chunks
└── engine.py        ← Orchestrates the full pipeline
```

### RAG Engine

```python
# rag/engine.py
class RAGEngine:
    def __init__(self, db, user_id: str):
        self.db = db
        self.user_id = user_id
        self.retriever = VectorRetriever(db, user_id)
        self.context_builder = ContextBuilder()

    async def query(self, question: str, top_k: int = 10, type_filter: str = None):
        # 1. Embed the question
        query_embedding = await self.embed_query(question)

        # 2. Retrieve relevant chunks from pgvector
        results = self.retriever.search(query_embedding, top_k, type_filter)

        # 3. Assemble context for the LLM
        context = self.context_builder.build(results, question)

        # 4. Generate response using LLM
        answer = await self.generate(context)

        # 5. Extract sources and file links
        sources = [{"id": r.id, "type": r.type, "source": r.source,
                     "score": r.score, "preview": r.content[:200]} for r in results]
        file_links = [r.metadata.get("webViewLink") or r.metadata.get("file_path")
                      for r in results if r.metadata.get("webViewLink") or r.metadata.get("file_path")]

        return {
            "answer": answer,
            "sources": sources,
            "documents": [r.id for r in results],
            "file_links": [l for l in file_links if l],
        }
```

### Document Chunker

```python
# rag/chunker.py
class DocumentChunker:
    def __init__(self, max_tokens: int = 512, overlap: int = 50):
        self.max_tokens = max_tokens
        self.overlap = overlap

    def chunk(self, content: str, metadata: dict) -> list[dict]:
        """Split content into overlapping chunks, preserving metadata."""
        tokens = self.tokenize(content)
        chunks = []
        start = 0
        while start < len(tokens):
            end = min(start + self.max_tokens, len(tokens))
            chunk_text = self.detokenize(tokens[start:end])
            chunks.append({
                "content": chunk_text,
                "metadata": metadata,
                "chunk_index": len(chunks),
                "total_chunks": None,  # filled after loop
            })
            start += self.max_tokens - self.overlap
        for c in chunks:
            c["total_chunks"] = len(chunks)
        return chunks
```

### Vector Retriever

```python
# rag/retriever.py
class VectorRetriever:
    def search(self, query_embedding: list[float], top_k: int = 10, type_filter: str = None):
        type_clause = "AND type = :item_type" if type_filter else ""
        sql = text(f"""
            SELECT id, type, source, sender_name, sender_email,
                   content, metadata, item_date, summary,
                   1 - (embedding <=> CAST(:vec AS vector)) AS score
            FROM items
            WHERE user_id = :uid AND embedding IS NOT NULL {type_clause}
            ORDER BY embedding <=> CAST(:vec AS vector)
            LIMIT :limit
        """)
        params = {"vec": str(query_embedding), "uid": self.user_id, "limit": top_k}
        if type_filter:
            params["item_type"] = type_filter
        return self.db.execute(sql, params).fetchall()
```

---

## 4. Frontend Implementation

### Next.js Dashboard Structure

```
dashboard/
├── app/
│   ├── layout.tsx               ← Root layout with nav + auth provider
│   ├── page.tsx                 ← Dashboard home / overview
│   ├── login/
│   │   └── page.tsx             ← Login (Google OAuth + Email/Password)
│   ├── register/
│   │   └── page.tsx
│   ├── connectors/
│   │   └── page.tsx             ← Service connection management
│   ├── search/
│   │   └── page.tsx             ← Semantic search UI
│   ├── chat/
│   │   └── page.tsx             ← Chatbot interface
│   ├── settings/
│   │   ├── page.tsx             ← User settings
│   │   └── api-keys/
│   │       └── page.tsx         ← Developer API key management
│   └── api/
│       └── auth/[...nextauth]/
│           └── route.ts
├── components/
│   ├── Navbar.tsx
│   ├── ConnectorCard.tsx        ← Individual service card (connect/sync/disconnect)
│   ├── SearchBar.tsx            ← Semantic search input
│   ├── SearchResults.tsx        ← Results with relevance scores
│   ├── ChatWindow.tsx           ← Chatbot interface
│   ├── ChatMessage.tsx          ← Individual message bubble
│   ├── ApiKeyManager.tsx        ← Generate/revoke API keys
│   └── SyncStatus.tsx           ← Real-time sync indicator
├── lib/
│   ├── api.ts                   ← Fetch wrapper for PersonalAPI
│   ├── ws.ts                    ← WebSocket connection manager
│   └── auth.ts                  ← Auth state management
├── hooks/
│   ├── useWebSocket.ts          ← Real-time update hook
│   ├── useSearch.ts             ← Debounced search hook
│   └── useChat.ts               ← Chat session management hook
└── styles/
    └── globals.css
```

### Key Dashboard Pages

**Connectors Page** — Users connect services by providing OAuth or API tokens:

```
┌──────────────────────────────────────────────────┐
│  🔗 Connected Services                          │
│──────────────────────────────────────────────────│
│  ┌────────────────┐  ┌────────────────┐         │
│  │  📧 Gmail      │  │  📁 Google     │         │
│  │  ✅ Connected  │  │  Drive         │         │
│  │  Synced: 2m    │  │  ✅ Connected  │         │
│  │  [Sync] [Disc] │  │  Synced: 15m   │         │
│  └────────────────┘  └────────────────┘         │
│  ┌────────────────┐  ┌────────────────┐         │
│  │  📝 Notion     │  │  💬 WhatsApp   │         │
│  │  ⚪ Not        │  │  ⚪ Not        │         │
│  │  Connected     │  │  Connected     │         │
│  │  [Connect]     │  │  [Connect]     │         │
│  └────────────────┘  └────────────────┘         │
│  ┌────────────────┐                              │
│  │  🎵 Spotify    │                              │
│  │  ⚪ Not        │                              │
│  │  Connected     │                              │
│  │  [Connect]     │                              │
│  └────────────────┘                              │
└──────────────────────────────────────────────────┘
```

**Chatbot Page** — Embedded RAG chatbot:

```
┌──────────────────────────────────────────────────┐
│  🤖 PersonalAPI Chat                             │
│──────────────────────────────────────────────────│
│                                                  │
│   You: What did Priya email about last week?     │
│                                                  │
│   Bot: Priya sent 3 emails last week:            │
│   1. Project deadline update (Mar 7)             │
│   2. Budget approval request (Mar 8)             │
│   3. Team meeting notes (Mar 10)                 │
│                                                  │
│   📎 Sources:                                    │
│   • email_abc123 (Gmail, 98.2% match)            │
│   • email_def456 (Gmail, 94.7% match)            │
│   • email_ghi789 (Gmail, 91.3% match)            │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Ask anything about your data...           │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**API Key Management** — Generate tokens for OpenClaw and developer access:

```
┌──────────────────────────────────────────────────┐
│  🔑 API Keys & Tokens                            │
│──────────────────────────────────────────────────│
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Name: My OpenClaw Bot                    │    │
│  │  Key:  sk_live_xxxx...                   │    │
│  │  Type: OpenClaw Agent                     │    │
│  │  Channels: Telegram, WhatsApp             │    │
│  │  Scopes: read:emails, read:documents      │    │
│  │  Last used: 2 hours ago                   │    │
│  │  [Revoke]                                 │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  [+ Generate New Key]                            │
└──────────────────────────────────────────────────┘
```

---

## 5. WebSocket Implementation

### Backend — WebSocket Manager

```python
# api/routers/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].remove(ws)

    async def broadcast(self, user_id: str, message: dict):
        for ws in self.active.get(user_id, []):
            await ws.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages (heartbeat, etc.)
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
```

### Frontend — WebSocket Hook

```typescript
// hooks/useWebSocket.ts
export function useWebSocket(userId: string) {
    const [events, setEvents] = useState<DataEvent[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/ws/${userId}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setEvents(prev => [data, ...prev]);
            // Trigger UI updates based on event type
            if (data.event === 'data.new') {
                toast(`New ${data.item_type} from ${data.service}`);
            }
        };
        wsRef.current = ws;
        return () => ws.close();
    }, [userId]);

    return { events };
}
```

---

## 6. MCP Server Implementation

```python
# mcp/server.py
from mcp import Server, Tool
from rag.engine import RAGEngine

server = Server("personalapi-mcp")

@server.tool("fetch_user_documents")
async def fetch_documents(user_id: str, service: str = None,
                          type: str = None, limit: int = 20):
    """Retrieve documents from user's data store."""
    db = get_db_session()
    query = db.query(Item).filter(Item.user_id == user_id)
    if service:
        query = query.filter(Item.source == service)
    if type:
        query = query.filter(Item.type == type)
    results = query.order_by(Item.item_date.desc()).limit(limit).all()
    return [item_to_dict(r) for r in results]

@server.tool("search_user_vectors")
async def search_vectors(user_id: str, query: str,
                         type: str = None, top_k: int = 10):
    """Semantic search across all indexed user data."""
    db = get_db_session()
    engine = RAGEngine(db, user_id)
    result = await engine.query(query, top_k=top_k, type_filter=type)
    return result

@server.tool("retrieve_file_links")
async def get_file_links(user_id: str, item_id: str):
    """Get path or download link for an item."""
    db = get_db_session()
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == user_id).first()
    if not item:
        return {"error": "Item not found"}
    return {
        "item_id": str(item.id),
        "file_path": f"/users/{user_id}/data/{item.source}/{item.type}_{item.source_id}.json",
        "web_link": item.metadata.get("webViewLink"),
    }

@server.tool("retrieve_conversation_history")
async def get_history(user_id: str, limit: int = 50, since: str = None):
    """Fetch past chatbot conversations."""
    db = get_db_session()
    query = db.query(ChatSession).filter(ChatSession.user_id == user_id)
    if since:
        query = query.filter(ChatSession.created_at >= since)
    sessions = query.order_by(ChatSession.updated_at.desc()).limit(limit).all()
    return [session_to_dict(s) for s in sessions]
```

---

## 7. OpenClaw Integration

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Telegram    │     │  OpenClaw    │     │  PersonalAPI     │
│  User sends  │────▶│  Agent       │────▶│  /v1/chat/msg    │
│  message     │     │  :9000       │     │  :8000           │
└──────────────┘     └──────┬───────┘     └────────┬─────────┘
                            │                      │
                            │                      ▼
                            │             ┌──────────────────┐
                            │             │  RAG Pipeline    │
                            │             │  Search + Answer │
                            │             └────────┬─────────┘
                            │                      │
                            ◀──────────────────────┘
                     Sends response
                     back to Telegram
```

### OpenClaw Proxy Endpoint

```python
# api/routers/openclaw.py
router = APIRouter(prefix="/openclaw", tags=["openclaw"])

@router.post("/query")
async def openclaw_query(
    message: str,
    channel: str,        # 'telegram' | 'whatsapp'
    api_key: str = Header(..., alias="X-API-Key"),
    db=Depends(get_db)
):
    """Endpoint for OpenClaw agents to query user data."""
    # Validate API key
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    api_key_record = db.query(ApiKey).filter(
        ApiKey.key_hash == key_hash,
        ApiKey.agent_type == "openclaw"
    ).first()
    if not api_key_record:
        raise HTTPException(401, "Invalid OpenClaw API key")
    if channel not in (api_key_record.allowed_channels or []):
        raise HTTPException(403, f"Channel '{channel}' not authorized")

    # Run RAG query
    engine = RAGEngine(db, str(api_key_record.user_id))
    result = await engine.query(message)

    # Log access
    log_access(api_key_record, "/openclaw/query", result)

    return {
        "answer": result["answer"],
        "sources": result["sources"][:3],  # limit for messaging
        "file_links": result.get("file_links", [])[:3],
    }
```

---

> **Next:** See [03-deployment-and-scaling.md](./03-deployment-and-scaling.md) for Docker setup, deployment, and scalability guide.
