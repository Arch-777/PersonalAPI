# 📖 PersonalAPI — Complete Hackathon Project Guide

**Duration:** 24 hours · **Team:** Om, Nishant, Ansh, Pratik

---

## 🎯 Project Context

**PersonalAPI = Stripe for Personal Data**

Your data is trapped across 30 apps (Gmail, Drive, WhatsApp, etc.). AI assistants fail because they have no context about your life. PersonalAPI unifies all personal data into one searchable, queryable API with built-in monetization.

**Demo in 15 seconds:**
```bash
# Search across all sources
curl 'https://your-demo.railway.app/search?q=rent+agreement' \
  -H 'Authorization: Bearer sk_free_xxxx'
```

Response: Gmail email + Drive document + WhatsApp message — all ranked by AI relevance in under 2 seconds.

**AI synthesis layer:**
```bash
curl -X POST '.../ask' -H 'Authorization: Bearer sk_pro_xxxx' \
  -d '{"question": "Status of my rent agreement with Rahul?"}'
→ "Rahul sent the agreement March 1 via Gmail. You confirmed in
   WhatsApp on March 5. The Drive doc was last modified March 3."
```

---

## 💰 The Business Model (Embedded in Code)

| Tier | Price | Req/min | `/ask` | Keys |
| --- | --- | --- | --- | --- |
| **Free** | ₹0 | 10 | ❌ | 1 |
| **Pro** | ₹799/mo | 120 | ✅ | 5 |
| **Developer** | ₹1499/mo | 600 | ✅ + Webhooks | 20 |

**Revenue mechanism:** The upgrade prompt is baked into the API response itself:
- Hit `/ask` on free tier → **HTTP 403** with `{code: feature_locked, upgrade_to: pro, upgrade_url: ...}`
- Hit request 11 on free tier → **HTTP 429** with `{code: rate_limit_exceeded, upgrade_rpm: 120}`

The pricing is the product feature.

---

## 👥 Team Split & Responsibilities

### Backend Team (Om + Nishant) — `feature/backend` branch

| Person | Hours | Module | Owns |
| --- | --- | --- | --- |
| **Om** | 0–15 | Database + Auth | `models.py` (schema), `apikeys.py` (key generation + rate limiting), `pricing.py` (tier config + feature gates), Redis setup, smoke test |
| **Nishant** | 0–24 | API + Deployment | `ingest.py` (data import), `search.py` (semantic search), `main.py` (all 7 endpoints), Railway deploy, `demo_script.sh`, live Q&A |

### Frontend Team (Ansh + Pratik) — `feature/frontend` branch

| Person | Hours | Module | Owns |
| --- | --- | --- | --- |
| **Ansh** | 0–20 | Search Dashboard | `src/app/page.tsx` (search UI, results, tabs, animations), hero bar, source filtering, result cards with relevance bars, empty state |
| **Pratik** | 0–20 | Developer Console + Errors | `src/app/(dashboard)/developer/page.tsx` (API key CRUD), `src/app/(dashboard)/pricing/page.tsx` (pricing tiers), `src/lib/api.ts` (axios interceptor), error banners (amber + red, auto-dismiss) |

---

## 📋 Detailed File Map

### Backend Files

```
backend/
├── models.py
│   └── SQLAlchemy ORM — 3 tables: items, api_keys, usage_log
│
├── apikeys.py
│   ├── generate_api_key(name, tier) → sk_free_xxxx (never stored raw)
│   └── verify_and_rate_limit(raw_key, endpoint) → Redis sliding window
│
├── pricing.py
│   ├── TIER_CONFIG dict with all tier specs
│   └── check_feature(api_key, feature) → raises 403 if locked
│
├── ingest.py
│   ├── embed(text) → OpenAI embeddings (text-embedding-3-small)
│   ├── ingest_gmail() → fetch + embed 10 emails
│   ├── ingest_drive() → fetch + embed 10 files
│   └── ingest_whatsapp() → parse + embed 10 conversations
│       (Run once to seed demo_data.db, commit to repo)
│
├── search.py
│   ├── embed(text)
│   └── semantic_search(query, filters, limit) → numpy cosine similarity
│
├── main.py (FastAPI app — all 7 routes)
│   ├── GET /health
│   ├── GET /search (Bearer token required)
│   ├── POST /ask (Pro+ only, calls gpt-4o-mini)
│   ├── GET /stats
│   ├── POST /keys/create
│   ├── GET /keys/list
│   ├── DELETE /keys/{prefix}
│   ├── GET /keys/{prefix}/usage
│   ├── GET /pricing
│   └── GET /demo (offline fallback)
│
├── demo_data.db (pre-seeded SQLite, committed to repo)
├── requirements.txt
├── Procfile (for Railway deploy)
├── demo_script.sh (7-step judge demo)
└── .env (OPENAI_API_KEY, REDIS_URL, DATABASE_URL)
```

### Frontend Files

```
dashboard/
├── src/app/
│   ├── page.tsx (Ansh)
│   │   ├── Hero bar: logo, search input, stats pill
│   │   ├── Source filter tabs (All, Gmail, Drive, WhatsApp)
│   │   ├── Results grid (2-col desktop, 1-col mobile)
│   │   ├── Result card: colored border, relevance %, content preview
│   │   ├── Empty state: 3 suggestion chips
│   │   ├── Skeleton loader (6 shimmer cards)
│   │   ├── Fixed bottom curl command bar
│   │   └── Animations: framer-motion stagger (50ms delay per card)
│   │
│   ├── (dashboard)/
│   │   ├── developer/page.tsx (Pratik)
│   │   │   ├── Key list table (name, tier, rpm, created, actions)
│   │   │   ├── Revealed key alert (amber, copy button, dismiss)
│   │   │   ├── "New Key" button → modal
│   │   │   ├── Create key modal: name input + tier picker
│   │   │   └── Wire: POST /keys/create, GET /keys/list, DELETE /keys/{prefix}
│   │   │
│   │   └── pricing/page.tsx (Pratik)
│   │       ├── 3-column card layout (free, pro, developer)
│   │       ├── Middle card (Pro): "Most Popular" badge
│   │       ├── Price display + USD conversion
│   │       ├── RPM badge
│   │       ├── Feature rows: ✅ included, ❌ locked
│   │       ├── Tier picker button: "Start with {tier}"
│   │       ├── FAQ section (3 Q&As)
│   │       └── Fetch from GET /pricing (after Hour 12)
│   │
│   └── layout.tsx (Pratik)
│       ├── Global QueryClientProvider
│       ├── Listen for 'feature-locked' event → FeatureLockedBanner
│       ├── Listen for 'rate-limited' event → RateLimitBanner
│       └── Auto-dismiss after N seconds
│
├── src/components/
│   ├── common/
│   │   ├── FeatureLockedBanner.tsx (Pratik)
│   │   │   ├── Amber bg (#f59e0b)
│   │   │   ├── Lock icon
│   │   │   ├── "X requires pro tier"
│   │   │   ├── "Upgrade for ₹799/mo" button
│   │   │   └── Auto-dismiss after 8s
│   │   │
│   │   └── RateLimitBanner.tsx (Pratik)
│   │       ├── Red bg (#ef4444)
│   │       ├── Gauge icon
│   │       ├── "Rate limit hit on free tier"
│   │       ├── Countdown timer (live seconds update)
│   │       ├── "Retry in Ns — or upgrade to Pro"
│   │       ├── Upgrade button
│   │       └── Auto-dismiss after retryAfter+2 seconds
│   │
│   ├── developer/
│   │   ├── KeyList.tsx
│   │   ├── CreateKeyModal.tsx
│   │   └── TierPicker.tsx
│   │
│   └── SearchResults.tsx (Ansh) — extracted result card logic
│
├── src/lib/
│   └── api.ts (Pratik)
│       ├── axios instance with NEXT_PUBLIC_API_URL
│       ├── setApiKey / getApiKey with localStorage
│       ├── Request interceptor: add Bearer token header
│       ├── Response interceptor:
│       │   ├── 403 feature_locked → dispatchEvent('feature-locked', {feature, upgradeTo, priceInr})
│       │   ├── 429 rate_limited → dispatchEvent('rate-limited', {retryAfter, currentTier, upgradeRpm})
│       │   └── 401 unauthorized → logout + redirect to /setup
│       └── Export: api instance (for all components)
│
├── src/types/
│   └── api.ts (Pratik)
│       ├── ApiKey interface
│       ├── KeyResponse interface
│       ├── TierConfig interface
│       ├── UsageStats interface
│       └── ApiError interface
│
├── .env.local
│   └── NEXT_PUBLIC_API_URL=http://localhost:8000 (hour 0-9)
│       NEXT_PUBLIC_API_URL=https://your-railway-url (after hour 9)
│
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## ⏱️ Critical Timeline

### Hour 0–2: Foundation
- **Om & Nishant:** Install deps, scaffold backend
- **Ansh & Pratik:** `create-next-app`, install UI deps, scaffold frontend

### Hour 2–5: Build Core Modules
- **Om:** `models.py` (3 tables), `apikeys.py` (key generation + hashing), `pricing.py` (tier config)
- **Nishant:** Connectors + `ingest.py` (embed + seed demo_data.db), `search.py`, start `main.py`
- **Ansh:** Search bar + source tabs, wire to API (mock for now)
- **Pratik:** Dev page mock UI, create API types (`src/types/api.ts`), design tier picker

### Hour 5–9: Integration
- **Om:** Redis sliding window rate limiter, smoke test
- **Nishant:** Complete all routes in `main.py`, deploy to Railway
- **Ansh:** Result cards, loading state, mobile responsive, deploy to Vercel
- **Pratik:** `src/lib/api.ts` interceptor, error banners (FeatureLockedBanner + RateLimitBanner), wire `/keys/*` endpoints

### Hour 9–12: Polish + Test
- **Om:** Pre-seed demo DB with 2 keys (free + pro), verify `/health`
- **Nishant:** Live `/demo` fallback, test all 9-point integration items
- **Ansh:** Test 10 queries, pick 3 best for slides, mobile polish
- **Pratik:** Wire `/pricing` endpoint, test banners on mobile, add toast notifications

### Hour 15: Integration Sync (All 4)
- Merge `feature/backend` into `main`
- Merge `feature/frontend` into `main`
- Run 9-point integration checklist
- Fix any bugs (CORS, auth, API URL, state management)

### Hour 15–20: Demo Polish
- **Nishant:** `demo_script.sh` works 3x clean
- **Ansh:** 3 best queries ready, screenshot for slides
- **Pratik:** Mobile testing, UX polish

### Hour 20–24: Presentation
- **Nishant:** 60-second pitch rehearsed
- **All:** Q&A talking points, judge demo roles assigned, slides complete

---

## 🔧 Technical Stack & Key Decisions

### Backend
- **Framework:** FastAPI (async, auto-docs, validation)
- **DB:** SQLite for demo (3 tables, ORM with SQLAlchemy)
- **Auth:** Bearer token + SHA-256 key hashing (zero-knowledge storage)
- **Rate Limiting:** Redis + sliding window with sorted sets
- **Embeddings:** OpenAI `text-embedding-3-small` (1536 dims)
- **Semantic Search:** NumPy cosine similarity
- **AI Synthesis:** GPT-4o-mini with RAG context
- **Deploy:** Railway (Uvicorn + auto-scaling)

### Frontend
- **Framework:** Next.js 14 (App Router, server/client components)
- **Language:** TypeScript strict mode
- **Styling:** Tailwind CSS + custom dark theme
- **UI Library:** shadcn/ui (optional, not required)
- **Data Fetching:** Axios + @tanstack/react-query (stale-time 30s)
- **Animations:** framer-motion (stagger, fade-up, hover effects)
- **Icons:** lucide-react
- **Error Handling:** Global interceptor → events → banners
- **Deploy:** Vercel (auto-deploy from `main`)

---

## 🚀 Deployment Checklist (Hour 9)

### Backend → Railway
```bash
# Create Procfile
echo 'web: uvicorn main:app --host 0.0.0.0 --port $PORT' > Procfile

# Add & commit demo data
git add demo_data.db && git commit -m "seed: demo data"

# Deploy
npx @railway/cli login && npx @railway/cli init && npx @railway/cli up

# Railway dashboard: add env vars
OPENAI_API_KEY=sk_test_...
REDIS_URL=<auto-set by Redis plugin>

# Verify
curl https://your-app.railway.app/health  # Should return 200
```

### Frontend → Vercel
```bash
# Set Railway URL
echo 'NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app' > .env.local

# Deploy
vercel --prod

# Verify
https://your-frontend.vercel.app  # Should load in <3s
```

---

## 🎯 9-Point Integration Checklist (Hour 15)

After merging both branches into `main`:

- [ ] `POST /keys/create?tier=free` → real key returned, warning shown in UI
- [ ] `/search` returns Gmail + Drive + WhatsApp results simultaneously
- [ ] Request 11 → HTTP 429 → red RateLimitBanner appears, counts down
- [ ] `POST /ask` with free key → HTTP 403 → amber FeatureLockedBanner appears
- [ ] Create pro key → `/ask` returns real AI answer with source attribution
- [ ] Usage chart shows real data from `/keys/{prefix}/usage`
- [ ] Revoke a key in UI → it disappears from list immediately
- [ ] Pricing page loads tier data from `GET /pricing` (not hardcoded)
- [ ] Railway + Vercel both live, no CORS errors, all route tests pass

---

## 📊 Demo Script (`demo_script.sh`) — 7 Steps

Nishant runs this live at judging:

1. **Create free key** → shows raw key (warning: shown once)
2. **Search works on free** → returns rent agreement + 2 other sources
3. **`/ask` LOCKED on free** → 403 with upgrade link
4. **Hit rate limit** → 429 at request 11
5. **Create pro key**
6. **`/ask` works on pro** → synthesizes answer from 3 sources
7. **Usage stats** → shows request counts by endpoint

Each step shows the curl command + response. Judge sees both the API response (with business model baked in) and the UI rendering those responses.

---

## 💬 Judge Q&A Talking Points

| Question | Answer (Om, Nishant answer) |
| --- | --- |
| **How is this different from Zapier?** | Zapier moves data on triggers. We're a persistent queryable data layer. Zapier can't answer "find the document Rahul discussed last month" in one call. We can. |
| **What about privacy?** | OAuth read-only scopes — we never write to any platform. Bank data uses RBI Account Aggregator (consent-based, end-to-end encrypted). |
| **Can this scale?** | SQLite handles 10K items for demo. Production: PostgreSQL + pgvector, same queries, 100x faster. Architecture ready. |
| **How do you make money?** | Free tier converts to Pro at ₹799/mo when they hit the wall (rate limit, feature lock). Upgrade prompt is in the 429/403 response — monetization is in the API. |
| **Security?** | API keys hashed with SHA-256, never stored raw. Bearer token auth. Rate limiting per key. Redis cache for fast rejection of invalid keys. |

---

## ✅ Definition of Done

### Backend
✅ 3 tables created and working
✅ API key generation (raw key shown once, only hash stored)
✅ Redis rate limiter (10 req/min on free)
✅ Pricing tiers configured with feature gating
✅ All 7 routes implemented + tested
✅ `/search` returns results in <2s
✅ `/ask` returns AI answer with pro key
✅ `demo_script.sh` runs end-to-end
✅ Deployed to Railway with live URL

### Frontend
✅ Search dashboard live with results
✅ Source filter tabs working
✅ Result cards with relevance bars + highlights
✅ Empty state + skeleton loader
✅ Animations smooth (framer-motion)
✅ Developer page with key CRUD
✅ Pricing page with live tier config
✅ Error banners (amber + red, auto-dismiss)
✅ Deployed to Vercel with real API URL

### Integration
✅ 9-point checklist all green
✅ No CORS errors
✅ Auth flow end-to-end
✅ Banners fire on 403 + 429

---

## 📚 Implementation Order (Recommended)

### For Om (Backend DB + Auth)
1. Create models.py with Item, ApiKey, UsageLog
2. Implement generate_api_key()
3. Create pricing.py with TIER_CONFIG
4. Implement check_feature()
5. Implement verify_and_rate_limit() with Redis
6. Test smoke test at hour 9

### For Nishant (Backend API)
1. Create ingest.py (embed + ingest from 3 sources)
2. Seed demo_data.db, commit to repo
3. Create search.py (embed + cosine similarity)
4. Create main.py with FastAPI routes (hour 2–5)
5. Complete all 7 routes (hour 5–9)
6. Deploy to Railway (hour 9)
7. Create demo_script.sh (hour 20–23)

### For Ansh (Frontend Search)
1. Setup Next.js + deps
2. Create search bar + source tabs (hour 2–5)
3. Create result card component (hour 5–9)
4. Add animations (framer-motion stagger)
5. Add empty state + skeleton loader
6. Deploy to Vercel (hour 9)
7. Polish mobile + select 3 best queries (hour 15–20)

### For Pratik (Frontend Dev)
1. Create API types (src/types/api.ts)
2. Create axios + interceptor (src/lib/api.ts)
3. Create error banners (FeatureLockedBanner, RateLimitBanner)
4. Create developer page mock (hour 0–5)
5. Wire real API endpoints (hour 9–12)
6. Create pricing page (hour 5–9)
7. Test banners on mobile (hour 15–20)

---

## 🎯 Win Criteria

✅ **Live demo works:** `curl /search?q=rent+agreement` → 3 sources in <2s

✅ **Economic model visible:** 429 rate limit → upgrade prompt in response body

✅ **AI works:** `/ask` on pro key → synthesizes answer + source attribution

✅ **Design beautiful:** Dark theme, smooth animations, mobile responsive

✅ **Deployed:** Both Railway + Vercel live, no 500 errors during judging

✅ **Pitch strong:** 60-second story + live demo + judge Q&A

---

## 📞 Communication & Branch Strategy

- **Main branch:** `main` — only for deployments (auto-deploy to Vercel)
- **Backend branch:** `feature/backend` (Om + Nishant) — merge to main at hour 15
- **Frontend branch:** `feature/frontend` (Ansh + Pratik) — merge to main at hour 15
- **Daily standups:** Hour 0, 6, 12, 18 (15 min each)
- **Integration sync:** Hour 15 (45 min all hands)
- **Demo rehearsal:** Hour 22 (30 min with Nishant)

---

## 🚦 Go/No-Go Decision Points

| Time | Decision | Go? |
| --- | --- | --- |
| Hour 5 | Both backend + frontend scaffolds complete, first routes stubbed | ? |
| Hour 9 | Backend deployed to Railway, frontend deployed to Vercel | ? |
| Hour 12 | All 7 backend routes + all 4 frontend pages complete + tested | ? |
| Hour 15 | 9-point integration checklist 8/9 or better | ? |
| Hour 20 | demo_script.sh runs 3x clean, no unresolved 500 errors | ? |
| Hour 23 | Pitch rehearsed, slides done, demo video recorded as backup | ? |

---

## 🏁 Final Reminders

1. **Commit demo_data.db** — judges need non-empty data immediately
2. **API keys are tested** — pre-seed 2 keys (free + pro) so judges can see key list without creating one
3. **demo_script.sh works offline** — have `/demo` fallback if wifi fails
4. **Timeboxing:** Stop new features at hour 20. Final 4 hours = presentation prep only.
5. **Mobile first:** Banners must render correctly on phone (that's where judges might test)
6. **Backup:** Download slides as PDF, save demo video locally

---

**Om, Nishant, Ansh, Pratik — you have everything. Ship it. Win. 🚀**
