# 🚀 Backend Implementation Plan — Personal API

**Team:** Om + Nishant · **Duration:** 24 hours · **Language:** Python (FastAPI)

---

## 📋 Overview

PersonalAPI is **Stripe for personal data**. The backend powers a unified REST API that:
- Unifies data across Gmail, Google Drive, WhatsApp into one searchable store
- Implements 3 pricing tiers (Free, Pro, Developer) with rate limiting enforced via Redis
- Provides AI-powered synthesis via `/ask` endpoint (Pro+ only)
- Returns monetization signals in HTTP responses (429 rate limit, 403 feature lock)

**Demo endpoint:**
```bash
curl 'https://your-demo.railway.app/search?q=rent+agreement' \
  -H 'Authorization: Bearer sk_free_xxxx'
```

---

## 👥 Role Division

| Person | Hours | Owns | Files |
| --- | --- | --- | --- |
| **Om** | 0–15 | Auth, keys, pricing, rate limiting, DB schema | `models.py`, `apikeys.py`, `pricing.py` |
| **Nishant** | 0–24 | API endpoints, data ingest, deployment | `main.py`, `search.py`, `ingest.py`, Railway, `demo_script.sh` |

---

## ⏱️ Hour-by-Hour Schedule

### Hours 0–2: Database Schema (Om)
- [ ] Create `models.py` with SQLAlchemy SQLite schema
- [ ] Define 3 tables: `items`, `api_keys`, `usage_log`
- [ ] Add BaseModel ORM methods
- [ ] Run `Base.metadata.create_all(engine)` to bootstrap DB

### Hours 0–2: Connectors + Ingest (Nishant)
- [ ] Create `ingest.py` with OAuth connector setup
- [ ] Implement Gmail message fetcher + embedder
- [ ] Implement Google Drive file fetcher + embedder
- [ ] Implement WhatsApp export parser + embedder
- [ ] Seed `demo_data.db` with 20–30 test items across all 3 sources

### Hours 2–5: Pricing Engine (Om)
- [ ] Create `pricing.py` with `TIER_CONFIG` dict
- [ ] Implement `check_feature(key, feature)` gate function
- [ ] Raise proper HTTP 403 responses with upgrade CTA

### Hours 2–5: API Key Management (Om) + API Routes (Nishant)
- [ ] Create `apikeys.py` with key generation + hashing
- [ ] Implement `generate_api_key(name, tier)` function
- [ ] Implement `verify_and_rate_limit(raw_key, endpoint)` function
- [ ] Start `main.py` with FastAPI app + basic routes

### Hours 2–5: Search Engine (Nishant)
- [ ] Create `search.py` with embedding functions
- [ ] Implement `embed(text)` using OpenAI API
- [ ] Implement `semantic_search(query, filters, limit)` with numpy cosine similarity

### Hours 5–9: Redis + Rate Limiter (Om)
- [ ] Integrate Redis client into `apikeys.py`
- [ ] Implement sliding window rate limiter
- [ ] Test with mock key hitting rate limit

### Hours 5–9: Complete API Routes (Nishant)
- [ ] Implement `/search` endpoint
- [ ] Implement `/ask` endpoint (RAG with GPT-4o-mini)
- [ ] Implement `/keys/*` endpoints (CRUD for API keys)
- [ ] Implement `/pricing` endpoint
- [ ] Implement `/stats` endpoint
- [ ] Implement `/health` endpoint
- [ ] Add CORS middleware

### Hours 9–12: Testing + Seed Data (Om + Nishant)
- [ ] Run smoke tests on auth + rate limiting
- [ ] Pre-seed demo DB with 2 keys (free + pro)
- [ ] Verify `/health` returns 200

### Hours 12–15: Deploy to Railway (Nishant)
- [ ] Create `Procfile` for Uvicorn
- [ ] Initialize Railway project
- [ ] Add Redis plugin
- [ ] Set environment variables (OPENAI_API_KEY, REDIS_URL)
- [ ] Deploy and verify endpoints

### Hours 15–20: Demo Script + Polish (Nishant)
- [ ] Create `demo_script.sh` with all 7 test steps
- [ ] Test script locally 3 times clean
- [ ] Commit to repo

### Hours 20–24: Q&A Prep (Om)
- [ ] Prepare answers on Redis architecture, security, scaling

---

## 📁 File Structure

```
backend/
├── main.py              # FastAPI app + all routes
├── models.py            # SQLAlchemy ORM + schema
├── apikeys.py           # Key generation + rate limiting
├── pricing.py           # Tier config + feature gates
├── search.py            # Embedding + semantic search
├── ingest.py            # Data import scripts (run once)
├── demo_data.db         # Pre-seeded SQLite (committed to repo)
├── env.example          # Template environment file
├── Procfile             # Uvicorn startup for Railway
└── requirements.txt     # Python dependencies
```

---

## 🔧 Pre-Hackathon Setup

### Install Dependencies
```bash
pip install fastapi uvicorn sqlalchemy openai redis numpy \
  google-auth google-auth-oauthlib google-api-python-client python-dotenv requests
```

### OAuth Setup (Om — 20 min night before)
1. Create Google Cloud project: `PersonalAPI-Hackathon`
2. Enable APIs: Gmail, Google Drive
3. Create Desktop App OAuth credential → download `credentials.json`
4. Add all 4 team emails as test users
5. Run OAuth flow once → commit `token.json`

### Create Accounts
- OpenAI API key (for embeddings + GPT-4o-mini)
- Railway account (for deploy)
- GitHub repo

---

## 💾 Database Schema — `models.py`

**3 tables: items, api_keys, usage_log**

### items Table
Unified data store for all sources.

```python
class Item(Base):
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True)
    type = Column(String)           # "email" | "document" | "message"
    source = Column(String)         # "gmail" | "drive" | "whatsapp"
    sender_name = Column(String)    # who sent it
    content = Column(Text)          # full body/text
    metadata_ = Column(String)      # JSON string with custom fields
    item_date = Column(DateTime)    # when it was created
    embedding_json = Column(String) # JSON array of floats (1536 dims)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self, include_embedding=False):
        """Return clean dict, content truncated to 500 chars"""
        return {
            "id": self.id,
            "type": self.type,
            "source": self.source,
            "sender": self.sender_name,
            "content": self.content[:500] if self.content else "",
            "date": self.item_date.isoformat() if self.item_date else None,
            "metadata": json.loads(self.metadata_) if self.metadata_ else {},
            **({"embedding": json.loads(self.embedding_json)} if include_embedding else {})
        }
```

### api_keys Table
Stores API keys (hashed, never raw).

```python
class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String, primary_key=True)  # UUID
    name = Column(String)                   # "Production Key", "Test Key"
    prefix = Column(String, unique=True)   # first 12 chars, shown in UI
    key_hash = Column(String)               # SHA-256(raw_key)
    tier = Column(String)                   # "free" | "pro" | "developer"
    rpm_limit = Column(Integer)             # requests per minute
    rpd_limit = Column(Integer)             # requests per day
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime)
    revoked = Column(Integer, default=0)    # 0 = active, 1 = revoked
    
    def to_dict(self):
        """Return without key_hash"""
        return {
            "id": self.id,
            "name": self.name,
            "prefix": self.prefix,
            "tier": self.tier,
            "rpm": self.rpm_limit,
            "created_at": self.created_at.isoformat(),
            "last_used": self.last_used_at.isoformat() if self.last_used_at else None
        }
```

### usage_log Table
Append-only request log.

```python
class UsageLog(Base):
    __tablename__ = "usage_log"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key_id = Column(String, ForeignKey("api_keys.id"))
    endpoint = Column(String)               # "/search", "/ask", etc
    status_code = Column(Integer)           # 200, 429, 403, etc
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Initialize at startup:**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./demo_data.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)
```

---

## 🔑 API Key Management — `apikeys.py`

Implements zero-knowledge key storage: raw key never persisted, only hash.

### generate_api_key(name: str, tier: str)
```python
import secrets
import hashlib
from sqlalchemy.orm import Session

def generate_api_key(db: Session, name: str, tier: str) -> tuple:
    """
    Generates a new API key.
    
    Returns: (raw_key, metadata_dict)
    - raw_key: shown ONCE only, never persisted
    - metadata: {id, name, prefix, tier, created_at}
    """
    raw_key = f"sk_{tier[:4]}_{secrets.token_urlsafe(24)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    prefix = raw_key[:12]  # "sk_free_xxxx"
    
    api_key = ApiKey(
        id=str(uuid.uuid4()),
        name=name,
        prefix=prefix,
        key_hash=key_hash,
        tier=tier,
        rpm_limit=TIER_CONFIG[tier]["rpm"],
        rpd_limit=TIER_CONFIG[tier]["rpd"]
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    return raw_key, api_key.to_dict()
```

### verify_and_rate_limit(db: Session, redis_client, raw_key: str, endpoint: str)
```python
from fastapi import HTTPException

def verify_and_rate_limit(db: Session, redis_client, raw_key: str, endpoint: str) -> ApiKey:
    """
    1. Hash the key
    2. Check Redis cache for quick rejection of non-existent keys
    3. DB lookup (cache miss for 5 min)
    4. Sliding window rate limit check
    5. Log usage
    6. Return ApiKey object
    """
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    cache_key = f"key:{key_hash}"
    
    # Redis cache check
    cached = redis_client.get(cache_key)
    if cached == b"0":  # Key marked as invalid
        raise HTTPException(status_code=401, detail={"code": "invalid_key"})
    
    # DB lookup
    api_key = db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()
    if not api_key or api_key.revoked:
        redis_client.setex(cache_key, 300, "0")  # Cache for 5 min
        raise HTTPException(status_code=401, detail={"code": "invalid_key"})
    
    if cached is None:  # Cache miss, store for 5 min
        redis_client.setex(cache_key, 300, api_key.id)
    
    # Rate limiting: sliding window with Redis sorted set
    tier_config = TIER_CONFIG[api_key.tier]
    rpm_limit = tier_config["rpm"]
    
    rate_limit_key = f"rpc:{api_key.id}:{endpoint}"
    now = time.time()
    window_start = now - 60  # 1-minute window
    
    pipe = redis_client.pipeline()
    pipe.zremrangebyscore(rate_limit_key, 0, window_start)  # Remove old entries
    pipe.zcard(rate_limit_key)  # Count requests in window
    pipe.expire(rate_limit_key, 120)  # Keep key alive
    results = pipe.execute()
    
    request_count = results[1]
    if request_count >= rpm_limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "rate_limit_exceeded",
                "upgrade_to": "pro" if api_key.tier == "free" else "developer",
                "upgrade_rpm": tier_config.get("next_rpm", 600),
                "upgrade_url": "https://personalapi.dev/upgrade"
            },
            headers={
                "Retry-After": "60",
                "X-RateLimit-Remaining": "0",
                "X-Tier": api_key.tier
            }
        )
    
    # Add this request to window
    pipe = redis_client.pipeline()
    pipe.zadd(rate_limit_key, {str(now): now})
    pipe.expire(rate_limit_key, 120)
    pipe.execute()
    
    # Log usage async (in production use Celery)
    usage_log = UsageLog(key_id=api_key.id, endpoint=endpoint, status_code=200)
    db.add(usage_log)
    db.commit()
    
    # Update last_used_at
    api_key.last_used_at = datetime.utcnow()
    db.commit()
    
    return api_key
```

---

## 💰 Pricing Engine — `pricing.py`

Tier configuration + feature gating.

```python
TIER_CONFIG = {
    "free": {
        "price_inr": 0,
        "rpm": 10,
        "rpd": 100,
        "ai_ask": False,
        "label": "Free",
        "features": ["Search", "API Keys", "Basic stats"],
        "locked": ["AI Synthesis (/ask)", "Advanced filters"]
    },
    "pro": {
        "price_inr": 799,
        "rpm": 120,
        "rpd": 5000,
        "ai_ask": True,
        "label": "Pro",
        "features": ["Search", "AI Synthesis", "5 API Keys", "Usage analytics"],
        "locked": ["Webhooks", "Custom connectors"]
    },
    "developer": {
        "price_inr": 1499,
        "rpm": 600,
        "rpd": 50000,
        "ai_ask": True,
        "label": "Developer",
        "features": ["Search", "AI Synthesis", "20 API Keys", "Webhooks", "Priority support"],
        "locked": []
    }
}

def check_feature(api_key: ApiKey, feature: str):
    """
    Raises HTTPException(403) if feature not enabled for tier.
    
    Usage:
        check_feature(key, "ai_ask")
    """
    config = TIER_CONFIG[api_key.tier]
    if not config.get(feature, False):
        # Find next tier with this feature
        tiers = ["free", "pro", "developer"]
        current_idx = tiers.index(api_key.tier)
        next_tier = tiers[current_idx + 1]
        next_config = TIER_CONFIG[next_tier]
        
        raise HTTPException(
            status_code=403,
            detail={
                "code": "feature_locked",
                "message": f"'{feature}' requires {next_tier} tier",
                "upgrade_to": next_tier,
                "price_inr": next_config["price_inr"],
                "upgrade_url": "https://personalapi.dev/upgrade"
            }
        )
```

---

## 🔍 Data Ingest — `ingest.py`

Runs once pre-hackathon to seed demo data.

```python
"""
Ingest module for seeding demo_data.db with:
- 10 Gmail emails
- 10 Google Drive files  
- 10 WhatsApp messages
All embedded using OpenAI's text-embedding-3-small
"""

import os
import json
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials as UserCredentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from openai import OpenAI
import numpy as np
from datetime import datetime, timedelta
from models import Item, engine, SessionLocal

OPENAI_CLIENT = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
DB = SessionLocal()

def embed(text: str) -> list:
    """Embed text using OpenAI's text-embedding-3-small (1536 dims)"""
    response = OPENAI_CLIENT.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def ingest_gmail():
    """Fetch first 10 emails from authenticated Gmail account"""
    # OAuth flow already done, load token.json
    creds = UserCredentials.from_authorized_user_file("token.json")
    service = build("gmail", "v1", credentials=creds)
    
    results = service.users().messages().list(userId="me", maxResults=10).execute()
    messages = results.get("messages", [])
    
    for msg in messages:
        msg_data = service.users().messages().get(userId="me", id=msg["id"]).execute()
        headers = msg_data["payload"]["headers"]
        
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "No subject")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "Unknown")
        body = msg_data["payload"].get("body", {}).get("data", "")
        
        content = f"{subject}\n\n{body[:1000]}"
        embedding = embed(content)
        
        item = Item(
            type="email",
            source="gmail",
            sender_name=sender,
            content=content,
            metadata_=json.dumps({"message_id": msg["id"]}),
            item_date=datetime.utcnow() - timedelta(days=np.random.randint(0, 30)),
            embedding_json=json.dumps(embedding)
        )
        DB.add(item)
    
    DB.commit()
    print(f"✅ Ingested {len(messages)} emails from Gmail")

def ingest_drive():
    """Fetch first 10 files from authenticated Google Drive"""
    creds = UserCredentials.from_authorized_user_file("token.json")
    service = build("drive", "v3", credentials=creds)
    
    results = service.files().list(
        pageSize=10,
        fields="files(id, name, modifiedTime, mimeType)"
    ).execute()
    files = results.get("files", [])
    
    for file in files:
        filename = file["name"]
        # In real scenario, download and parse file
        # For demo, just use filename + mock content
        content = f"{filename}\n\nDocument content preview..."
        embedding = embed(content)
        
        item = Item(
            type="document",
            source="drive",
            sender_name="Google Drive",
            content=content,
            metadata_=json.dumps({"file_id": file["id"], "mime": file["mimeType"]}),
            item_date=datetime.fromisoformat(file["modifiedTime"].replace("Z", "+00:00")),
            embedding_json=json.dumps(embedding)
        )
        DB.add(item)
    
    DB.commit()
    print(f"✅ Ingested {len(files)} files from Drive")

def ingest_whatsapp():
    """Parse WhatsApp chat export and ingest as grouped messages"""
    # WhatsApp exports as .txt, parse by timestamp
    if not os.path.exists("whatsapp_export.txt"):
        print("⚠️ whatsapp_export.txt not found, skipping WhatsApp ingest")
        return
    
    with open("whatsapp_export.txt") as f:
        lines = f.readlines()
    
    # Group messages into conversations (60-min gap = new thread)
    conversations = []
    current_thread = []
    
    for line in lines:
        # WhatsApp format: [2025-03-13, 14:23:45] Sender: Message
        if line.startswith("["):
            current_thread.append(line)
        else:
            if current_thread and len(current_thread) > 0:
                conversations.append("\n".join(current_thread))
                current_thread = []
    
    # Embed first 10 conversations
    for i, conv in enumerate(conversations[:10]):
        embedding = embed(conv[:1000])  # Embed first 1000 chars
        sender = conv.split("] ", 1)[1].split(": ", 1)[0] if "] " in conv else "Unknown"
        
        item = Item(
            type="message",
            source="whatsapp",
            sender_name=sender,
            content=conv,
            metadata_=json.dumps({"conversation_length": len(conv)}),
            item_date=datetime.utcnow() - timedelta(days=np.random.randint(0, 7)),
            embedding_json=json.dumps(embedding)
        )
        DB.add(item)
    
    DB.commit()
    print(f"✅ Ingested {min(len(conversations), 10)} WhatsApp conversations")

if __name__ == "__main__":
    print("🚀 Starting data ingest...")
    ingest_gmail()
    ingest_drive()
    ingest_whatsapp()
    print("✅ Demo data seeded to demo_data.db")
```

**Run once:**
```bash
python ingest.py
git add demo_data.db && git commit -m "seed: pre-embedded demo data"
```

---

## 🔎 Semantic Search — `search.py`

Vector similarity search over embedded items.

```python
import json
import numpy as np
from sqlalchemy.orm import Session
from models import Item
from openai import OpenAI

OPENAI_CLIENT = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def embed(text: str) -> list:
    """Embed text using text-embedding-3-small"""
    response = OPENAI_CLIENT.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def semantic_search(
    db: Session,
    query: str,
    type_filter: str = None,
    source_filter: str = None,
    limit: int = 10
) -> list:
    """
    Semantic similarity search.
    
    1. Embed query
    2. Load all items from DB
    3. Cosine similarity for each
    4. Sort by score
    5. Return top N as dicts with relevance_score (0-1)
    """
    query_embedding = embed(query)
    query_vec = np.array(query_embedding)
    
    # Build query
    items_query = db.query(Item)
    if type_filter:
        items_query = items_query.filter(Item.type == type_filter)
    if source_filter:
        items_query = items_query.filter(Item.source == source_filter)
    
    items = items_query.all()
    results = []
    
    for item in items:
        item_embedding = json.loads(item.embedding_json)
        item_vec = np.array(item_embedding)
        
        # Cosine similarity
        similarity = np.dot(query_vec, item_vec) / (
            np.linalg.norm(query_vec) * np.linalg.norm(item_vec) + 1e-8
        )
        
        # Normalize to 0-1 range (cosine is -1 to 1)
        relevance_score = (similarity + 1) / 2
        
        results.append({
            **item.to_dict(),
            "relevance_score": round(relevance_score, 3),
            "content_preview": item.content[:200] if item.content else ""
        })
    
    # Sort by relevance and return top N
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:limit]
```

---

## 🌐 API Routes — `main.py`

Main FastAPI application with all endpoints.

```python
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import redis
import os
from datetime import datetime
from openai import OpenAI

from models import SessionLocal, Item, ApiKey, UsageLog
from apikeys import generate_api_key, verify_and_rate_limit
from pricing import check_feature, TIER_CONFIG
from search import semantic_search

app = FastAPI(title="PersonalAPI", version="0.1.0")
OPENAI_CLIENT = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
REDIS_CLIENT = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============ PUBLIC ENDPOINTS ============

@app.get("/health")
def health():
    """Health check"""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/pricing")
def pricing_endpoint(db: Session = Depends(get_db)):
    """Return all tier configs"""
    return TIER_CONFIG

@app.get("/demo")
def demo_fallback():
    """Offline fallback demo response (in case API is down)"""
    return {
        "query": "rent agreement",
        "results": [
            {
                "id": 1,
                "source": "gmail",
                "type": "email",
                "sender": "Rahul <rahul@example.com>",
                "content": "Hi, I'm sending you the rent agreement for the apartment...",
                "date": "2025-03-01T10:00:00",
                "relevance_score": 0.95
            },
            {
                "id": 5,
                "source": "drive",
                "type": "document",
                "sender": "Google Drive",
                "content": "Apartment Rental Agreement - March 2025",
                "date": "2025-03-03T14:30:00",
                "relevance_score": 0.92
            },
            {
                "id": 12,
                "source": "whatsapp",
                "type": "message",
                "sender": "Rahul",
                "content": "Agreement received. I'll sign and send back by tomorrow.",
                "date": "2025-03-05T08:15:00",
                "relevance_score": 0.87
            }
        ]
    }

# ============ SEARCH ENDPOINT ============

@app.get("/search")
def search(
    q: str = Query(..., min_length=1),
    type: str = Query(None),
    source: str = Query(None),
    limit: int = Query(10, le=50),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Semantic search across all data sources.
    
    Required: Authorization header with Bearer token
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "missing_auth"})
    
    raw_key = authorization.replace("Bearer ", "")
    api_key = verify_and_rate_limit(db, REDIS_CLIENT, raw_key, "/search")
    
    results = semantic_search(db, q, type_filter=type, source_filter=source, limit=limit)
    
    return {
        "query": q,
        "tier": api_key.tier,
        "count": len(results),
        "results": results
    }

# ============ AI /ask ENDPOINT (Pro+ only) ============

@app.post("/ask")
def ask(
    body: dict,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    AI synthesis endpoint — answers questions over your personal data.
    
    Required: Pro or Developer tier
    Requires: {"question": "..."}
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "missing_auth"})
    
    raw_key = authorization.replace("Bearer ", "")
    api_key = verify_and_rate_limit(db, REDIS_CLIENT, raw_key, "/ask")
    
    # Feature gate
    check_feature(api_key, "ai_ask")
    
    question = body.get("question", "")
    
    # Get top 5 relevant items
    context_items = semantic_search(db, question, limit=5)
    
    # Build context string
    context = "Relevant personal data:\n\n"
    sources = []
    for item in context_items:
        context += f"[{item['source'].upper()}] {item['content_preview']}\n"
        sources.append({
            "source": item["source"],
            "relevance": item["relevance_score"]
        })
    
    # Call GPT-4o-mini with context
    response = OPENAI_CLIENT.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant that answers questions ONLY using the provided context. Never make up information. Always cite which source each fact comes from."
            },
            {
                "role": "user",
                "content": f"{context}\n\nQuestion: {question}"
            }
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    answer = response.choices[0].message.content
    
    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "tier": api_key.tier
    }

# ============ STATS ENDPOINT ============

@app.get("/stats")
def stats(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """Get aggregate stats (total items, by source)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "missing_auth"})
    
    raw_key = authorization.replace("Bearer ", "")
    api_key = verify_and_rate_limit(db, REDIS_CLIENT, raw_key, "/stats")
    
    total = db.query(Item).count()
    by_source = {}
    for source in ["gmail", "drive", "whatsapp"]:
        by_source[source] = db.query(Item).filter(Item.source == source).count()
    
    return {
        "total_items": total,
        "by_source": by_source
    }

# ============ API KEY MANAGEMENT ============

@app.post("/keys/create")
def create_key(
    name: str = Query(...),
    tier: str = Query("free"),
    db: Session = Depends(get_db)
):
    """Create a new API key"""
    if tier not in TIER_CONFIG:
        raise HTTPException(status_code=400, detail={"error": "invalid_tier"})
    
    raw_key, metadata = generate_api_key(db, name, tier)
    
    return {
        "api_key": raw_key,  # Shown ONCE
        "key": metadata,
        "warning": "⚠️ Copy this key now — shown only once!"
    }

@app.get("/keys/list")
def list_keys(db: Session = Depends(get_db)):
    """List all API keys (safe, no raw keys)"""
    keys = db.query(ApiKey).filter(ApiKey.revoked == 0).all()
    return {
        "keys": [k.to_dict() for k in keys]
    }

@app.delete("/keys/{prefix}")
def revoke_key(prefix: str, db: Session = Depends(get_db)):
    """Revoke an API key by prefix"""
    api_key = db.query(ApiKey).filter(ApiKey.prefix == prefix).first()
    if not api_key:
        raise HTTPException(status_code=404, detail={"error": "key_not_found"})
    
    api_key.revoked = 1
    db.commit()
    
    return {"status": "revoked"}

@app.get("/keys/{prefix}/usage")
def key_usage(prefix: str, db: Session = Depends(get_db)):
    """Get usage stats for a specific key"""
    api_key = db.query(ApiKey).filter(ApiKey.prefix == prefix).first()
    if not api_key:
        raise HTTPException(status_code=404, detail={"error": "key_not_found"})
    
    usage = db.query(UsageLog).filter(UsageLog.key_id == api_key.id).all()
    
    # Group by endpoint
    by_endpoint = {}
    for log in usage:
        if log.endpoint not in by_endpoint:
            by_endpoint[log.endpoint] = 0
        by_endpoint[log.endpoint] += 1
    
    return {
        "key": api_key.to_dict(),
        "total_requests": len(usage),
        "by_endpoint": by_endpoint,
        "usage_by_day": "placeholder"  # In production, group by date
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 🚀 Deployment to Railway

### Step 1: Create Procfile
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Step 2: Commit demo data
```bash
git add demo_data.db requirements.txt Procfile
git commit -m "feat: backend ready for Railway deploy"
```

### Step 3: Deploy
```bash
npx @railway/cli login
npx @railway/cli init
npx @railway/cli up
```

### Step 4: Set environment variables on Railway
- `OPENAI_API_KEY` = your OpenAI key
- `REDIS_URL` = add Redis plugin (auto-set)

### Step 5: Verify
```bash
BASE="https://your-app.railway.app"
curl "$BASE/health"  # Should return 200
```

---

## 📝 Demo Script — `demo_script.sh`

```bash
#!/bin/bash
set -e

BASE="${1:-https://your-app.railway.app}"

echo "🚀 PersonalAPI Demo Script"
echo "Base URL: $BASE"
echo ""

# 1. Create free key
echo "=== 1. CREATE FREE KEY ==="
RESPONSE=$(curl -s -X POST "$BASE/keys/create?name=JudgeDemo&tier=free")
FREE_KEY=$(echo $RESPONSE | jq -r '.api_key')
echo "Free Key: $FREE_KEY"
echo ""

# 2. Search works on free
echo "=== 2. SEARCH (works on free) ==="
curl -s "$BASE/search?q=rent+agreement" \
  -H "Authorization: Bearer $FREE_KEY" | jq '.results[0:2]'
echo ""

# 3. /ask is LOCKED on free
echo "=== 3. /ask ENDPOINT (LOCKED on free tier) ==="
curl -s -X POST "$BASE/ask" \
  -H "Authorization: Bearer $FREE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize rent agreement status"}' | jq '.'
echo "^ Notice 403 feature_locked with upgrade CTA"
echo ""

# 4. Hit rate limit
echo "=== 4. RATE LIMITING (10 req/min on free) ==="
for i in {1..12}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE/search?q=test" -H "Authorization: Bearer $FREE_KEY")
  if [ "$CODE" = "429" ]; then
    echo "✅ Request $i: 429 RATE LIMITED (as expected)"
    break
  else
    echo "   Request $i: $CODE OK"
  fi
done
echo ""

# 5. Create pro key
echo "=== 5. CREATE PRO KEY ==="
RESPONSE=$(curl -s -X POST "$BASE/keys/create?name=ProDemo&tier=pro")
PRO_KEY=$(echo $RESPONSE | jq -r '.api_key')
echo "Pro Key: $PRO_KEY"
echo ""

# 6. /ask works on pro
echo "=== 6. /ask ENDPOINT (enabled on pro) ==="
curl -s -X POST "$BASE/ask" \
  -H "Authorization: Bearer $PRO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is my rent agreement status with Rahul?"}' | jq '.'
echo ""

# 7. Usage stats
echo "=== 7. USAGE STATS ==="
curl -s "$BASE/stats" \
  -H "Authorization: Bearer $PRO_KEY" | jq '.'
echo ""

echo "✅ Demo complete!"
```

**Make executable & test:**
```bash
chmod +x demo_script.sh
./demo_script.sh https://your-railway-url
```

---

## ✅ Hour 9 Smoke Test

```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Run smoke test
python -c "
import sys
from sqlalchemy.orm import Session
from models import SessionLocal
from apikeys import generate_api_key, verify_and_rate_limit
import redis

db = SessionLocal()
redis_client = redis.Redis()

# Generate free key
raw_key, meta = generate_api_key(db, 'smoke_test', 'free')
print(f'✅ Generated key: {raw_key[:20]}...')

# Hit rate limit
for i in range(12):
    try:
        verify_and_rate_limit(db, redis_client, raw_key, '/test')
        print(f'   Req {i+1}: OK')
    except Exception as e:
        if '429' in str(e):
            print(f'✅ Req {i+1}: Rate limited (expected)')
            sys.exit(0)

print('❌ Rate limiter failed')
sys.exit(1)
"
```

**Expected output:**
```
✅ Generated key: sk_free_xxxx...
   Req 1: OK
   Req 2: OK
   ...
   Req 10: OK
✅ Req 11: Rate limited (expected)
```

---

## 📋 Requirements.txt

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
openai==1.3.9
redis==5.0.1
numpy==1.24.3
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-api-python-client==2.108.0
python-dotenv==1.0.0
requests==2.31.0
```

Install with:
```bash
pip install -r requirements.txt
```

---

## 🔐 Environment Variables (.env)

```
OPENAI_API_KEY=sk_test_...
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:///./demo_data.db
```

---

## 🏁 Completion Checklist

**Hours 0–5:**
- [ ] `models.py` with 3 tables complete
- [ ] `ingest.py` runs and seeds demo_data.db
- [ ] `apikeys.py` generates keys with hashing
- [ ] `pricing.py` defines tiers and feature gates
- [ ] `search.py` implements semantic search

**Hours 5–9:**
- [ ] Redis rate limiter working
- [ ] All 7 routes in `main.py` implemented
- [ ] Smoke test passes (rate limit at req 11)
- [ ] `demo_data.db` committed to repo

**Hours 9–15:**
- [ ] Railway deploy successful
- [ ] `/health` returns 200
- [ ] `demo_script.sh` works end-to-end

**Hours 15–20:**
- [ ] 2 pre-made keys (free + pro) in seed DB
- [ ] All 7 demo script steps pass

**Hours 20–24:**
- [ ] Q&A talking points prepared
- [ ] Pitch rehearsed

---

## 🎯 Success Criteria

✅ **15-second demo:** `curl /search?q=rent+agreement` returns Gmail + Drive + WhatsApp results in <2 seconds

✅ **AI layer:** `curl POST /ask` with free key returns 403 with upgrade link; with pro key returns AI answer

✅ **Business model in the code:** 429 rate limit response includes `upgrade_to`, `upgrade_rpm`, `upgrade_url` — upgrade CTAis embedded in the API

✅ **Zero-knowledge keys:** Raw API key never stored, only SHA-256 hash

✅ **Deployed:** Live on Railway with real Redis

---

**Go build. Win the hackathon. 🚀**
