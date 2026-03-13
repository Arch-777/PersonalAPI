# 🚀 PersonalAPI — Deployment & Scaling Guide

> **Version:** 2.0 · **Updated:** 2026-03-13
>
> Docker services, deployment architecture, environment configuration, and future scalability strategies.

---

## Table of Contents

- [1. Docker Services](#1-docker-services)
- [2. Dockerfile](#2-dockerfile)
- [3. Environment Configuration](#3-environment-configuration)
- [4. Deployment Architecture](#4-deployment-architecture)
- [5. Database Management](#5-database-management)
- [6. Monitoring & Observability](#6-monitoring--observability)
- [7. Security Checklist](#7-security-checklist)
- [8. Build Schedule](#8-build-schedule)
- [9. Future Scalability](#9-future-scalability)
- [10. Common Mistakes to Avoid](#10-common-mistakes-to-avoid)

---

## 1. Docker Services

### docker-compose.yml

```yaml
services:
  # ─── Database ───────────────────────────────────────────────
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: personalapi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-localpass}
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─── Cache & Broker ─────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  # ─── FastAPI Backend ────────────────────────────────────────
  api:
    build: .
    command: uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
    volumes:
      - .:/app
      - userdata:/app/users          # User data filesystem
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    ports: ["8000:8000"]

  # ─── Celery Workers ────────────────────────────────────────
  worker-google:
    build: .
    command: celery -A workers.celery_app worker -Q google,embedding,default -l info -c 4
    volumes:
      - .:/app
      - userdata:/app/users
    env_file: .env
    depends_on: [db, redis]

  worker-services:
    build: .
    command: celery -A workers.celery_app worker -Q whatsapp,notion,spotify -l info -c 4
    volumes:
      - .:/app
      - userdata:/app/users
    env_file: .env
    depends_on: [db, redis]

  # ─── Celery Beat (Scheduler) ───────────────────────────────
  beat:
    build: .
    command: celery -A workers.celery_app beat --loglevel=info
    volumes:
      - .:/app
    env_file: .env
    depends_on: [redis]

  # ─── Flower Monitor ────────────────────────────────────────
  flower:
    image: mher/flower
    command: celery --broker=redis://redis:6379/0 flower --port=5555
    depends_on: [redis]
    ports: ["5555:5555"]

  # ─── Next.js Dashboard ─────────────────────────────────────
  dashboard:
    build: ./dashboard
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000
      NEXT_PUBLIC_WS_URL: ws://api:8000
    depends_on: [api]

volumes:
  pgdata:
  redisdata:
  userdata:
```

### Service Map

| Container | Image | Purpose | Ports |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | PostgreSQL + vector extension | 5432 |
| `redis` | `redis:7-alpine` | Celery broker + cache + pub/sub | 6379 |
| `api` | Custom (Dockerfile) | FastAPI backend + WebSocket | 8000 |
| `worker-google` | Custom | Google services + embedding workers | — |
| `worker-services` | Custom | WhatsApp, Notion, Spotify workers | — |
| `beat` | Custom | Celery periodic task scheduler | — |
| `flower` | `mher/flower` | Worker monitoring dashboard | 5555 |
| `dashboard` | Custom (Next.js) | Web frontend | 3000 |

---

## 2. Dockerfile

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Create user data directory
RUN mkdir -p /app/users

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dashboard Dockerfile

```dockerfile
# dashboard/Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 3. Environment Configuration

```bash
# .env.example — copy to .env and fill with real values

# ── Database ──────────────────────────────────────────
DATABASE_URL=postgresql://postgres:localpass@db:5432/personalapi

# ── Redis ─────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0

# ── Auth ──────────────────────────────────────────────
SECRET_KEY=your-secret-key-min-32-chars-long-randomized
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Google OAuth ──────────────────────────────────────
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback/google

# ── WhatsApp Business API ─────────────────────────────
WHATSAPP_API_TOKEN=your-whatsapp-business-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id

# ── Notion ────────────────────────────────────────────
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
NOTION_REDIRECT_URI=http://localhost:8000/auth/callback/notion

# ── Spotify ───────────────────────────────────────────
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=http://localhost:8000/auth/callback/spotify

# ── OpenAI (Embeddings + Chat) ────────────────────────
OPENAI_API_KEY=sk-...

# ── Encryption ────────────────────────────────────────
# Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-fernet-key

# ── User Data Path ────────────────────────────────────
USER_DATA_ROOT=/app/users
```

---

## 4. Deployment Architecture

### Development (Local)

```
docker compose up  →  All services on localhost
API:        http://localhost:8000/docs
Dashboard:  http://localhost:3000
Flower:     http://localhost:5555
```

### Production (Cloud)

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                      │
│                                                              │
│   Load Balancer (nginx / AWS ALB)                            │
│   ├── :443 → Dashboard (Next.js)                             │
│   ├── :443/api → FastAPI backend                             │
│   └── :443/ws  → WebSocket upgrade                           │
│                                                              │
│   Compute                                                    │
│   ├── API:     2+ containers (horizontal scale)              │
│   ├── Workers: 1 per queue (scale per service load)          │
│   └── Beat:    1 instance (singleton scheduler)              │
│                                                              │
│   Data                                                       │
│   ├── PostgreSQL:  Managed DB (AWS RDS / Supabase)           │
│   ├── Redis:       Managed (AWS ElastiCache / Upstash)       │
│   └── File Store:  S3 / GCS (replace local filesystem)       │
│                                                              │
│   Secrets: AWS Secrets Manager / Vault                       │
└──────────────────────────────────────────────────────────────┘
```

### Startup Sequence

```bash
# 1. Start infrastructure
docker compose up -d db redis

# 2. Run migrations
docker compose run --rm api alembic upgrade head

# 3. Start API + workers
docker compose up -d api worker-google worker-services beat

# 4. Start monitoring
docker compose up -d flower

# 5. Start dashboard
docker compose up -d dashboard

# 6. Verify
curl http://localhost:8000/docs    # API docs
curl http://localhost:3000         # Dashboard
curl http://localhost:5555         # Flower
```

---

## 5. Database Management

### Alembic Migrations

```bash
# Initialize (first time only)
alembic init migrations

# Generate migration from model changes
alembic revision --autogenerate -m "add chat tables"

# Apply all pending migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1
```

### pgvector Index Strategy

```sql
-- DO NOT add until you have 10,000+ rows
-- IVFFlat requires training data to build clusters
-- Full table scan is faster with fewer rows

-- After 10K rows:
CREATE INDEX idx_items_embedding
    ON items USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- After 1M rows, switch to HNSW:
CREATE INDEX idx_items_embedding_hnsw
    ON items USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### Backup Strategy

```bash
# Daily DB backup
pg_dump -h localhost -U postgres personalapi > backup_$(date +%Y%m%d).sql

# User data backup (filesystem)
tar -czf userdata_$(date +%Y%m%d).tar.gz /app/users/
```

---

## 6. Monitoring & Observability

| Tool | Purpose | URL |
|---|---|---|
| **Flower** | Celery task monitoring, worker status | `:5555` |
| **FastAPI /docs** | API documentation, interactive testing | `:8000/docs` |
| **PostgreSQL** | `SELECT count(*) FROM items` — data volume | psql |
| **Redis** | `redis-cli info` — queue depth, memory | redis-cli |
| **Access Log** | `SELECT * FROM access_log ORDER BY accessed_at DESC` | psql |

### Key Metrics to Track

| Metric | Query / Method |
|---|---|
| Total items ingested | `SELECT count(*) FROM items` |
| Items per source | `SELECT source, count(*) FROM items GROUP BY source` |
| Pending embeddings | `SELECT count(*) FROM items WHERE embedding IS NULL` |
| Connector health | `SELECT platform, status FROM connectors` |
| API key usage | `SELECT key_prefix, last_used FROM api_keys` |
| Sync freshness | `SELECT platform, last_synced FROM connectors` |

---

## 7. Security Checklist

### Pre-Launch

- [ ] All OAuth tokens encrypted with Fernet (never plaintext)
- [ ] API keys stored as SHA-256 hashes only
- [ ] `SECRET_KEY` is 32+ random characters
- [ ] `ENCRYPTION_KEY` generated via `Fernet.generate_key()`
- [ ] CORS restricted to dashboard domain only
- [ ] HTTPS enforced in production
- [ ] `prompt="consent"` set in Google OAuth flow
- [ ] Rate limiting configured on all public endpoints
- [ ] `UNIQUE(user_id, source, source_id)` constraint in place

### Ongoing

- [ ] Rotate `SECRET_KEY` every 90 days
- [ ] Audit `access_log` table weekly
- [ ] Monitor for expired/errored connectors
- [ ] Review API key scopes periodically
- [ ] Patch dependencies monthly

---

## 8. Build Schedule

| Week | Focus | Key Tasks | Done When |
|---|---|---|---|
| **1** | Foundation | Repo, Docker Compose, DB schema, Alembic, Google Cloud project | `docker compose up` works, tables exist |
| **2** | Gmail Connector | OAuth flow, Celery worker, GmailNormalizer, token encryption | Emails syncing into `items` table |
| **3** | Search + RAG | Embedding worker, `/search` endpoint, RAG engine, chunker | `/search?q=...` returns scored results |
| **4** | Auth + Keys | User registration/login, JWT, API keys, access log | Two users with isolated data |
| **5** | More Connectors | Drive, WhatsApp, Notion normalizers + workers | Multi-source search works |
| **6** | Dashboard | Next.js UI, connector management, chatbot, WebSocket | Interactive demo-ready |
| **7** | OpenClaw | Telegram/WhatsApp agent, OpenClaw token flow | Query via messaging apps |
| **8** | Polish | MCP server, error handling, retry logic, monitoring | Production-ready |

---

## 9. Future Scalability

### More Connectors

Adding a new service requires **only 2 new files** — the system scales by convention:

```
1. workers/{service}_worker.py    ← Celery task (fetch + paginate)
2. normalizer/{service}.py        ← BaseNormalizer subclass

No changes to: DB schema, API endpoints, RAG pipeline, dashboard.
```

**Candidate connectors:** Slack, GitHub, Linear, Twitter/X, Discord, iMessage, Outlook, Dropbox, Figma, Jira, Trello.

### Large User Datasets

| Challenge | Strategy |
|---|---|
| **10K+ items** | Enable IVFFlat vector index on pgvector |
| **100K+ items** | Switch to HNSW index, increase `ef_search` |
| **1M+ items** | Partition `items` table by `user_id`, shard DB |
| **Large files** | Move file storage to S3/GCS with signed URLs |
| **Slow embeddings** | Batch embed with rate limiting, priority queues |
| **Search latency** | Add Redis result cache (TTL 5 min for hot queries) |

### Distributed Workers

```
# Scale specific worker queues independently
docker compose up --scale worker-google=3
docker compose up --scale worker-services=2

# Or deploy workers on separate machines
celery -A workers.celery_app worker -Q google -c 8 --hostname=google@%h
celery -A workers.celery_app worker -Q embedding -c 4 --hostname=embed@%h
```

### Multi-Region Strategy

```
Region A (Primary)             Region B (Read Replica)
┌──────────────────┐           ┌──────────────────┐
│  API + Workers   │           │  API (read-only)  │
│  PostgreSQL (RW) │──────────▶│  PostgreSQL (RO)  │
│  Redis (Primary) │           │  Redis (Replica)  │
│  S3 (Primary)    │           │  S3 (Replicated)  │
└──────────────────┘           └──────────────────┘
```

### Event-Driven Architecture (Future)

As the system grows, replace direct service calls with an event bus:

```
Worker completes sync
    → Publish: "items.synced" event
    → Subscribers:
        ├── Embedding service (generates vectors)
        ├── Notification service (alerts dashboard)
        ├── Analytics service (tracks metrics)
        └── Webhook service (external integrations)
```

---

## 10. Common Mistakes to Avoid

| Mistake | Why It Matters |
|---|---|
| Building all connectors at once | Gmail alone teaches 80% of the patterns. Ship one first. |
| Running embeddings in the API path | Syncing 500 emails will timeout. Always use Celery workers. |
| Storing OAuth tokens in plaintext | Retrofitting encryption on live data is extremely painful. |
| Skipping the UNIQUE constraint | Without `UNIQUE(user_id, source, source_id)`, every re-sync doubles data. |
| Adding vector index too early | IVFFlat needs 10K+ rows. Full scan is faster with fewer rows. |
| Optimizing schema prematurely | Ship the single `items` table first. Split only if you hit real perf issues. |
| Forgetting `prompt="consent"` | Without it, Google only returns `refresh_token` once. |
| Not logging data access | The `access_log` table is your compliance and debugging lifeline. |

---

## MVP Milestone Checklist

- [ ] `docker compose up` starts all services cleanly
- [ ] User can register and log in (email + Google OAuth)
- [ ] User can connect Gmail, Drive, Notion, WhatsApp, Spotify
- [ ] Celery workers sync data into `items` table
- [ ] Data files written to `/users/{id}/data/{service}/`
- [ ] `GET /v1/search?q=...` returns semantically relevant results
- [ ] Chatbot answers questions about user data with source citations
- [ ] WebSocket pushes live updates to connected dashboard
- [ ] User data is fully isolated between users
- [ ] Developer can generate API key and access data programmatically
- [ ] OpenClaw token flow works for Telegram/WhatsApp access
- [ ] MCP tools are accessible for external LLM agents

**All boxes checked = production-ready PersonalAPI platform.**

---

> **See also:**
> - [01-system-architecture.md](./01-system-architecture.md) — System design and architecture diagrams
> - [02-implementation-guide.md](./02-implementation-guide.md) — Backend and frontend implementation details
> - [dev-reference.md](../dev-reference.md) — Original development reference guide
