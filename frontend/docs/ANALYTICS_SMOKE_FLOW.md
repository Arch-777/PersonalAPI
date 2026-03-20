# Dashboard Analytics Smoke Flow

Purpose: quick validation for analytics controls, query refresh behavior, and panel rendering.

## Preconditions

1. Frontend is running (`npm run dev`) and user is authenticated.
2. Backend analytics endpoints are reachable.
3. Test account has at least some request activity in `access_logs`.

## Smoke Steps

1. Open dashboard home.
2. Confirm analytics control strip is visible:
   - Window chips: `7d`, `30d`, `90d`
   - Granularity chips: `hour`, `day`
3. Record baseline values from KPI cards (Requests, Error Rate, Avg Latency, P95 Latency).
4. Change window from `30d` to `7d`.
5. Verify:
   - KPI values update.
   - Trend chart title updates to `Request Trend (7 days)`.
   - Top paths title updates to `Top Paths (7 days)`.
6. Change granularity from `day` to `hour`.
7. Verify trend chart x-axis changes to denser buckets.
8. Switch back to `90d` and `day`.
9. Verify trend chart and breakdown panels refresh without page reload.
10. If a panel fails, click its retry action:
    - `Retry Summary`
    - `Retry Trend`
    - `Retry Status`
    - `Retry Paths`
11. Confirm retry triggers data reload and panel exits error state when API recovers.

## Empty-State Checks

1. Use an account with no analytics data or a very narrow window with no traffic.
2. Verify dashed empty cards appear for:
   - Trend panel
   - Status breakdown panel
   - Top paths panel

## Pass Criteria

1. Controls always trigger fresh query results.
2. No console/runtime errors while toggling controls repeatedly.
3. Error states show a clear message and retry button.
4. Loading skeletons are shown during pending fetches.
5. Empty states are clear and non-blocking when no data is available.

## Automation

Automated smoke harness is available using Playwright.

1. List smoke tests:
   - `npm run test:smoke:list`
2. Run analytics smoke test:
   - `npm run test:smoke:analytics`

Cross-browser scope:

* Runs against Chromium, Firefox, and WebKit projects from `playwright.config.ts`.

Spec file:

* `tests/analytics-dashboard.smoke.spec.ts`

## CI Modes

1. Fast PR gate:
   - Trigger: pull requests touching frontend/workflow files.
   - Browser: Chromium only.
   - Goal: quick feedback for contributor iteration speed.
2. Full coverage run:
   - Trigger: push to `main`, nightly schedule, or manual dispatch.
   - Browsers: Chromium + Firefox + WebKit.
   - Goal: broader compatibility validation before and after merge.

Manual dispatch mode selection:

* `run_mode=fast` -> runs Chromium quick gate only (15-20 seconds).
* `run_mode=full` (default) -> runs full cross-browser coverage (Chromium + Firefox + WebKit).
* `browser_selection` (optional, only with `run_mode=full`):
  - `all` (default) -> test all three browsers.
  - `chromium-only` -> test Chromium only (for debugging WebKit/Firefox issues separately).
  - `firefox-only` -> test Firefox only.
  - `webkit-only` -> test WebKit only.

**Artifact retention:**
- Fast runs: 7 days
- Full runs: 14 days

Notification behavior:

* Failure notifications are suppressed for draft PRs.
