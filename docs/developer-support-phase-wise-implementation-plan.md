# Developer Support Platform - Phase-Wise Detailed Implementation Plan

## 1. Document Objective
This plan translates the production strategy into execution-level work items so the team can deliver a public beta developer platform with predictable quality.

Primary outcome:
- Third-party developers can sign up, generate keys, call APIs to fetch multi-platform data, receive webhook updates, and monitor usage.

Launch mode assumed:
- Public beta
- API key first (server-to-server)
- Free plus Paid tiers
- Enterprise-readiness controls started in beta

## 2. Planning Assumptions and Constraints
- Existing backend already has auth, API key lifecycle basics, connectors, workers, and access logs.
- Existing frontend already has dashboard and integration docs foundations.
- OAuth app marketplace for external app publishing is out of scope for public beta.
- This plan is optimized for speed plus safety, not for maximum feature breadth.

## 3. Team Model and Ownership
Core pod:
1. Backend Lead: API contract, scopes, quotas, webhook engine.
1. Backend Engineer: analytics endpoints, webhook delivery jobs, tests.
1. Frontend Engineer: developer portal pages and onboarding UX.
1. Platform Engineer: CI/CD, observability, reliability, rollout controls.
1. Security and Compliance Owner: key management, audit controls, SOC2 readiness mapping.
1. DevRel and Product Owner: docs quality, quickstarts, feedback loop.

Decision cadence:
1. Daily 15-minute standup.
1. Twice-weekly architecture check.
1. Weekly launch scorecard review.

## 4. Timeline Overview (0-90 Days)
1. Phase 0 (Days 0-14): Contract and launch baseline freeze.
1. Phase 1 (Days 15-35): API platform hardening.
1. Phase 2 (Days 22-45): Webhooks and analytics core build (parallelized).
1. Phase 3 (Days 36-60): Developer portal, docs explorer, and SDKs.
1. Phase 4 (Days 50-75): Production operations and compliance hardening.
1. Phase 5 (Days 76-90): Canary and staged public beta rollout.

## 5. Phase 0 - Contract and Launch Baseline Freeze (Days 0-14)
Goal:
- Lock what will be shipped and how it behaves so engineering can move in parallel without contract churn.

Detailed tasks:
1. Define v1 endpoint catalog.
1. Confirm required endpoints for data fetch and search.
1. Confirm webhook lifecycle endpoints.
1. Confirm analytics summary endpoints.
1. Confirm developer key management endpoints.
1. Define request and response schemas per endpoint.
1. Define pagination shape and defaults.
1. Define filtering and sorting conventions.
1. Define idempotency behavior for mutating requests.
1. Define standard error envelope and code taxonomy.
1. Define key scope matrix by endpoint.
1. Define Free and Paid quota matrix.
1. Define launch SLOs and pass-fail thresholds.
1. Define support model for beta users.
1. Define deprecation and versioning policy.
1. Freeze acceptance criteria for each phase.

Repository touchpoints:
1. docs/developer-support-plan.md
1. docs/FRONTEND_API_REFERENCE.md
1. backend/api/main.py
1. backend/api/routers/developer.py
1. backend/api/routers/search.py
1. backend/api/routers/connectors.py

Deliverables:
1. Signed-off v1 API contract doc.
1. Signed-off scope and quota matrix.
1. Signed-off launch scorecard template.

Exit criteria:
1. Contract freeze approved by backend, frontend, product, and security owners.
1. No blocking ambiguity on v1 behavior remains.

## 6. Phase 1 - API Platform Hardening (Days 15-35)
Goal:
- Implement deterministic authorization and usage controls before opening self-serve beta.

Detailed tasks:
1. Extend API key model for plan tier metadata.
1. Add request quota counters and reset window fields.
1. Add explicit scope storage per API key.
1. Add key status transitions and revocation metadata consistency checks.
1. Implement tier-aware rate limit resolution.
1. Implement quota decrement logic with atomicity guarantees.
1. Add response headers for remaining quota and reset timestamp.
1. Add route-level scope checks for every protected endpoint.
1. Add centralized error code definitions and mapping helpers.
1. Standardize HTTP error payload formatting across routers.
1. Add request-id propagation middleware.
1. Add version and deprecation headers in global middleware.
1. Add migration scripts for schema changes.
1. Add regression tests for scope, quota, and revocation behavior.

Repository touchpoints:
1. backend/api/models/api_key.py
1. backend/api/core/rate_limit.py
1. backend/api/core/config.py
1. backend/api/core/security.py
1. backend/api/main.py
1. backend/api/routers/developer.py
1. backend/api/routers/search.py
1. backend/api/routers/connectors.py
1. backend/migrations/
1. backend/tests/test_api.py

Deliverables:
1. Tier and quota enforcement merged.
1. Scope enforcement merged across protected routes.
1. Error model and request-id model standardized.

Exit criteria:
1. Revoked keys fail immediately.
1. Unauthorized scope attempts return deterministic errors.
1. Quota math remains correct under concurrent requests.

## 7. Phase 2 - Webhooks and Analytics Core (Days 22-45)
Goal:
- Provide event-driven integration and visibility into API usage.

Detailed tasks:
1. Design webhook data model.
1. Add webhook subscription CRUD routes.
1. Add endpoint verification and secret management rules.
1. Implement HMAC signature generation for outbound payloads.
1. Implement webhook retry strategy with exponential backoff.
1. Add dead-letter queue tracking for permanently failed deliveries.
1. Add webhook delivery audit table.
1. Emit events from connector sync lifecycle.
1. Emit events from critical API lifecycle actions.
1. Build usage analytics aggregation queries from access logs.
1. Build summary endpoints for request volume, latency, and errors.
1. Add webhook and analytics test suites, including failure injection tests.

Repository touchpoints:
1. backend/api/models/access_log.py
1. backend/api/routers/connectors.py
1. backend/workers/celery_app.py
1. backend/workers/connector_sync.py
1. backend/api/core/security.py
1. backend/api/core/config.py
1. backend/tests/test_celery_foundation.py
1. backend/tests/test_api.py

Deliverables:
1. Stable webhook delivery subsystem with delivery visibility.
1. Analytics endpoints consumable by portal dashboards.

Exit criteria:
1. Webhook signature verification passes in sample consumer tests.
1. Delivery retries and dead-letter transitions are observable and deterministic.
1. Analytics endpoints align with raw access log totals.

## 8. Phase 3 - Developer Experience Layer (Days 36-60)
Goal:
- Make integration friction low through self-serve UX, docs, and SDKs.

Detailed tasks:
1. Build portal Information Architecture.
1. Add onboarding quickstart page.
1. Add API keys management page.
1. Add webhooks management page.
1. Add usage analytics page.
1. Add changelog and release notes page.
1. Expose and validate OpenAPI specification endpoint.
1. Publish interactive API explorer path.
1. Write curl quickstart snippets for top use cases.
1. Generate TypeScript SDK from OpenAPI and add ergonomic wrapper.
1. Generate Python SDK from OpenAPI and add ergonomic wrapper.
1. Add SDK smoke tests and usage examples.
1. Expand Postman collection with webhook and analytics workflows.
1. Validate docs accuracy against deployed responses.

Repository touchpoints:
1. frontend/docs/API_INTEGRATION.md
1. frontend/docs/DASHBOARD_DESIGN.md
1. frontend/lib/api-client.ts
1. frontend/hooks/use-auth.ts
1. docs/postman/PersonalAPI.postman_collection.json
1. docs/FRONTEND_API_REFERENCE.md
1. backend/api/main.py

Deliverables:
1. Developer portal minimum v1 pages shipped.
1. TS and Python SDKs published and tested.
1. OpenAPI and docs explorer available.

Exit criteria:
1. A fresh internal tester can complete onboarding to first successful request in under 20 minutes.
1. SDK quickstarts work end-to-end on clean environments.

## 9. Phase 4 - Production Operations and Compliance Hardening (Days 50-75)
Goal:
- Ensure launch can sustain incidents, scale events, and enterprise due diligence.

Detailed tasks:
1. Add CI workflows for lint, tests, migration checks, and security checks.
1. Add release branch policy and required checks.
1. Add structured logging format and correlation id fields.
1. Add tracing and metrics instrumentation.
1. Add dashboards for latency, error rate, queue depth, webhook success rate.
1. Add alert policies and paging routes.
1. Add secrets rotation and key compromise runbooks.
1. Add backup and restore drill schedule.
1. Add retention and deletion policy implementation checklist.
1. Add SOC2 readiness control mapping backlog.
1. Add DPA request process template for enterprise customers.

Repository touchpoints:
1. docs/03-deployment-and-scaling.md
1. backend/docker-compose.yml
1. backend/docker-compose.coolify.yml
1. backend/api/main.py
1. backend/workers/celery_app.py
1. backend/tests/test_live_backend.py

Deliverables:
1. Operational readiness scorecard with green status.
1. Incident runbook pack.
1. Compliance-readiness baseline documentation.

Exit criteria:
1. All mandatory release checks block merges when failing.
1. Alerting and dashboards validated via simulation.
1. Recovery procedures tested and documented.

## 10. Phase 5 - Canary and Staged Public Beta Rollout (Days 76-90)
Goal:
- Release safely while collecting structured adoption feedback.

Detailed tasks:
1. Select canary developers and define traffic limits.
1. Roll out with feature flags by tier and endpoint groups.
1. Monitor launch scorecard daily.
1. Run triage rituals for incidents and docs issues.
1. Tune quotas and rate limits based on observed usage.
1. Publish weekly changelog for beta participants.
1. Expand self-serve access in controlled cohorts.
1. Create prioritized backlog from support and telemetry findings.

Deliverables:
1. Public beta announcement readiness packet.
1. Weekly beta health reports.
1. Post-beta roadmap for OAuth app flow and event catalog expansion.

Exit criteria:
1. 2 consecutive weeks of stable SLO attainment.
1. No unresolved critical launch-blocking issues.

## 11. Week-by-Week Micro Execution Plan (First 6 Weeks)
Week 1:
1. Freeze contract and scope matrix.
1. Freeze quota matrix and support model.
1. Finalize launch scorecard fields.

Week 2:
1. Implement schema updates for scopes and quotas.
1. Add migrations and data backfill if needed.
1. Add unit tests for model changes.

Week 3:
1. Implement enforcement in middleware and routers.
1. Add standardized error mapping.
1. Add route-level authz test matrix.

Week 4:
1. Implement webhook model and delivery pipeline.
1. Add signature and retry behavior.
1. Add delivery observability hooks.

Week 5:
1. Implement analytics summary endpoints.
1. Add portal key and analytics views.
1. Add first OpenAPI-driven SDK generation pipeline.

Week 6:
1. Finish quickstart docs and examples.
1. Run internal onboarding tests.
1. Start canary candidate onboarding.

## 12. Detailed Test Plan by Phase
Phase 0 tests:
1. Contract review checklist completed.
1. Endpoint schema snapshot approved.

Phase 1 tests:
1. Scope deny and allow matrix tests.
1. Quota decrement and reset tests.
1. Revoked and expired key behavior tests.
1. Concurrency tests for quota race conditions.

Phase 2 tests:
1. Webhook signature validation tests.
1. Retry and dead-letter routing tests.
1. Event payload schema compatibility tests.
1. Analytics aggregate correctness tests.

Phase 3 tests:
1. Portal onboarding usability tests.
1. SDK compile and run smoke tests.
1. Docs-link and example freshness tests.

Phase 4 tests:
1. Alert simulation tests.
1. Backup and restore drill validation.
1. Incident runbook tabletop exercise.

Phase 5 tests:
1. Canary traffic ramp validations.
1. Beta incident-response SLA measurements.

## 13. Launch Scorecard Template
Mandatory green checks:
1. Security: scope enforcement, key revocation, webhook signatures.
1. Reliability: webhook success rate, queue health, API uptime.
1. Performance: p95 latency targets and error rate limits.
1. DX: onboarding completion rate and SDK quickstart success.
1. Operations: CI/CD gate compliance and alerting readiness.
1. Compliance: audit logging and retention policy status.

## 14. Risk Register (Execution-Level)
Risk 1: Contract changes after implementation starts.
1. Mitigation: weekly contract freeze review with explicit change control.

Risk 2: Scope checks missed on low-traffic endpoints.
1. Mitigation: route inventory test that fails if endpoint lacks scope mapping.

Risk 3: Webhook retries flood queues during downstream outages.
1. Mitigation: capped exponential backoff, dead-letter caps, and per-tenant delivery limits.

Risk 4: Documentation drift from actual API behavior.
1. Mitigation: contract tests and docs updates as a release gate.

Risk 5: Beta support burden exceeds team capacity.
1. Mitigation: staged cohort rollout and strict beta support playbook.

## 15. Post-Beta Immediate Expansion (Preview)
1. OAuth app registration and consent flows for third-party applications.
1. Webhook replay tooling and event versioning.
1. Additional SDK language support based on adoption data.
1. Enterprise plan controls and SLA hardening.

## 16. Phase 0 Execution Pack (Initial Draft - 2026-03-18)

### 16.1 Baseline Gap Analysis (Current Implementation vs Phase 0/1 Contract)

Observed from current repository implementation:

| Area | Current state | Gap to close before freeze complete | Priority |
|---|---|---|---|
| Endpoint catalog | Core auth, search, connectors, and developer key lifecycle routes exist. | Webhook subscription lifecycle endpoints and analytics summary endpoints are not present yet. | High |
| API key metadata | API keys store name, prefix/hash, allowed_channels, agent_type, expires_at, revoked_at, last_used_at. | Tier metadata, quota counters, quota reset window, and explicit endpoint scopes are not modeled yet. | High |
| Authorization model | JWT user auth is enforced for protected user routes. Inbound x-api-key rate-limit middleware exists. | Route-level API key scope authorization matrix enforcement is not implemented. | High |
| Rate limiting and quotas | Redis sliding-window inbound limit keyed by api-key hash exists. | Tier-aware policy resolution and atomic monthly quota decrement/reset are missing. | High |
| Error contract | Routes mostly return detail payloads with route-specific text. | Unified error envelope with deterministic error codes and request_id is not standardized. | High |
| Request correlation | access_logs model has request_id column. | Request-id generation/propagation middleware and response header are missing. | High |
| Versioning and deprecation | Global app version is set in FastAPI metadata. | Runtime response headers for API version/deprecation policy are missing. | Medium |
| Pagination/filter/sort conventions | Offset/limit and top_k conventions exist in several endpoints. | Cross-endpoint written contract for defaults and constraints needs explicit freeze table. | Medium |
| OpenAPI/explorer | Default FastAPI openapi/docs endpoints are available. | Public beta contract requires explicit publish path, ownership, and freshness checks. | Medium |
| Access analytics readiness | access_logs model exists. | Request logging writes and analytics aggregate endpoints are not implemented. | High |

### 16.2 Contract Freeze Checklist (Signoff Checklist)

Mark each item as Done before Phase 0 exit.

| Item | Owner | Artifact | Status |
|---|---|---|---|
| Freeze v1 endpoint catalog (included vs deferred) | Backend Lead + Product | Section 16.3 | TODO |
| Freeze request/response schemas for each v1 endpoint | Backend Lead + Frontend Lead | docs/FRONTEND_API_REFERENCE.md | TODO |
| Freeze pagination/filter/sort conventions and defaults | Backend Lead | Section 16.6 | TODO |
| Freeze idempotency rules for mutating endpoints | Backend Lead + Security | Section 16.7 | TODO |
| Freeze standard error envelope + error code taxonomy | Backend Lead | Section 16.8 | TODO |
| Freeze API key endpoint scope matrix | Backend Lead + Security | Section 16.4 | TODO |
| Freeze Free/Paid quota and rate-limit matrix | Backend Lead + Product | Section 16.5 | TODO |
| Freeze versioning/deprecation response header policy | Backend Lead + DevRel | Section 16.9 | TODO |
| Freeze launch scorecard thresholds | Platform + Security + Product | Section 16.10 | TODO |
| Final cross-functional signoff (Backend/Frontend/Product/Security) | Product Owner | Release note in docs/developer-support-plan.md | TODO |

### 16.3 v1 Endpoint Catalog (Freeze Candidate)

Included in public beta v1:
1. Auth:
	- POST /auth/register
	- POST /auth/login
	- POST /auth/google
	- GET /auth/google/connect
	- GET /auth/google/callback
	- GET /auth/me
1. Data and search:
	- GET /v1/emails/
	- GET /v1/documents/
	- GET /v1/search/
1. Connectors:
	- GET /v1/connectors/
	- GET /v1/connectors/{platform}
	- POST /v1/connectors/{platform}/bootstrap
	- POST /v1/connectors/{platform}/sync
	- PATCH /v1/connectors/{platform}/auto-sync
	- DELETE /v1/connectors/{platform}
	- OAuth connect/callback endpoints for github, google, notion, spotify, slack
1. Developer keys:
	- POST /v1/developer/api-keys
	- GET /v1/developer/api-keys
	- POST /v1/developer/api-keys/{api_key_id}/revoke

Deferred from public beta v1 (explicitly not frozen as shipped behavior yet):
1. Webhook subscription CRUD and delivery introspection endpoints.
1. Usage analytics summary endpoints (request volume, latency, error slices).

### 16.4 Endpoint Scope Matrix (Freeze Candidate)

Proposed API key scopes for server-to-server developer usage:

| Scope | Allows |
|---|---|
| data.read | GET /v1/emails/, GET /v1/documents/, GET /v1/search/ |
| connectors.read | GET /v1/connectors/, GET /v1/connectors/{platform} |
| connectors.write | POST /v1/connectors/{platform}/bootstrap, POST /v1/connectors/{platform}/sync, PATCH /v1/connectors/{platform}/auto-sync, DELETE /v1/connectors/{platform} |
| keys.read | GET /v1/developer/api-keys |
| keys.write | POST /v1/developer/api-keys, POST /v1/developer/api-keys/{api_key_id}/revoke |
| webhooks.read | Reserved for Phase 2 webhook list/get endpoints |
| webhooks.write | Reserved for Phase 2 webhook create/update/delete endpoints |
| analytics.read | Reserved for Phase 2 analytics summary endpoints |

Scope defaults by plan for beta:
1. Free default: data.read, connectors.read, keys.read, keys.write.
1. Paid default: data.read, connectors.read, connectors.write, keys.read, keys.write, analytics.read.
1. Webhook scopes enabled only when webhook endpoints are released.

### 16.5 Free vs Paid Quota Matrix (Freeze Candidate)

| Dimension | Free | Paid |
|---|---|---|
| Monthly request quota | 5,000 | 250,000 |
| Inbound API requests per minute (RPM) | 60 | 600 |
| Connector sync trigger calls per minute | 6 | 60 |
| Concurrent sync jobs per developer | 1 | 5 |
| Webhook endpoints | 1 (after release) | 25 (after release) |
| Analytics retention | 7 days | 90 days |
| Key rotation recommendation | Every 90 days | Every 60 days |

Reset policy:
1. Monthly quota resets at 00:00 UTC on the first day of month.
1. RPM windows are sliding 60-second windows.
1. All limit responses must include Retry-After when blocked.

### 16.6 Pagination/Filter/Sort Contract (Freeze Candidate)

1. Pagination defaults:
	- limit default 20, max 100.
	- offset default 0.
1. Search defaults:
	- top_k default 10, min 1, max 50.
1. Sorting:
	- list endpoints default order by created_at desc unless endpoint-specific domain order is defined.
1. Filtering:
	- scalar filters use exact match unless query parameter docs explicitly define partial/fuzzy behavior.

### 16.7 Idempotency Rules (Freeze Candidate)

1. POST routes that create mutable resources (for example developer API key creation and future webhook creation) must support Idempotency-Key header.
1. Same Idempotency-Key plus same authenticated principal plus same route payload within 24 hours must return the first successful result.
1. Same key with a different payload must return conflict error code IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD.

### 16.8 Standard Error Envelope and Code Taxonomy (Freeze Candidate)

Standard envelope:

```json
{
  "error": {
	 "code": "RATE_LIMIT_EXCEEDED",
	 "message": "Too many requests",
	 "request_id": "req_01HT...",
	 "retry_after_seconds": 18
  }
}
```

Initial code taxonomy:
1. AUTH_MISSING_CREDENTIALS
1. AUTH_INVALID_TOKEN
1. AUTH_SCOPE_DENIED
1. API_KEY_REVOKED
1. API_KEY_EXPIRED
1. RATE_LIMIT_EXCEEDED
1. QUOTA_EXCEEDED
1. VALIDATION_ERROR
1. RESOURCE_NOT_FOUND
1. CONFLICT
1. PROVIDER_UPSTREAM_ERROR
1. INTERNAL_ERROR

### 16.9 Versioning and Deprecation Header Policy (Freeze Candidate)

All v1 responses should include:
1. X-API-Version: v1
1. X-Request-ID: req_<id>

Deprecation responses (when relevant) should include:
1. Deprecation: true
1. Sunset: <RFC 1123 date>
1. Link: <deprecation doc URL>; rel="deprecation"

### 16.10 Launch Scorecard Thresholds (Freeze Candidate)

| Domain | Metric | Beta threshold (must be green) |
|---|---|---|
| Security | Scope enforcement coverage | 100% protected routes mapped to scopes |
| Security | Revocation propagation | Revoked key denied on next request |
| Security | Webhook signature validation | 100% pass for signed sample payload suite |
| Reliability | API uptime | >= 99.9% rolling 30 days |
| Reliability | Webhook success within retry window | >= 99% |
| Performance | Read endpoint latency p95 | <= 450 ms |
| Performance | Search latency p95 | <= 900 ms |
| Quality | 5xx rate | < 1.0% daily |
| DX | Time to first successful API call | <= 20 minutes median in onboarding tests |
| Operations | Required CI checks on default branch | 100% blocking when failed |
| Compliance | Auditability | Request id and actor linkage on all protected requests |

### 16.11 Immediate Work Queue to Close Top Gaps (Next 10 Working Days)

1. Implement request-id middleware and include X-Request-ID response header.
1. Implement unified error response helper and map all routers to deterministic error codes.
1. Extend api_keys schema/model with plan_tier, scopes, monthly_quota, quota_used, quota_window_start, quota_window_end.
1. Add atomic quota check/decrement function and attach quota headers on responses.
1. Add route inventory test that fails when protected endpoint lacks required scope mapping.
1. Add analytics summary endpoints over access logs.
1. Add webhook subscription and delivery model skeleton with signed payload helper.

---
This document is the detailed execution companion for the high-level developer support production strategy and should be reviewed weekly during the beta runway.