# GitHub Branch Protection Rules Setup

Purpose: enforce analytics smoke test gates across pull requests and main branch to ensure code quality and CI reliability before merge.

## Overview

The two-tier CI strategy (fast/full) is enforced through GitHub branch protection rules:

| Tier | Trigger | Jobs | Required For |
|------|---------|------|--------------|
| **Fast** | PR creation, manual dispatch `run_mode=fast` | `analytics-smoke-fast` (Chromium only) | Pull requests (quick contributor feedback) |
| **Full** | Push to main, nightly schedule, manual dispatch `run_mode=full` | `analytics-smoke-full` (Chromium + Firefox + WebKit) | Main branch (comprehensive validation before merge) |

## Protection Rules

### Rule 1: Pull Request Protection

**Scope:** `main` branch

**Status Check Requirement:**

```
Job Name: analytics-smoke-fast
```

**Effect:**

- PR cannot be merged until `analytics-smoke-fast` passes (Chromium smoke test completes successfully).
- Provides quick feedback loop for contributors (typically completes in 15-30 seconds).

**Configuration UI Path:**

1. Repository → Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Require status checks to pass before merging: ✓ Enabled
4. Search for job: `analytics-smoke-fast`
5. Select: `analytics-smoke-fast`
6. Require branches to be up to date before merging: ✓ Enabled

**Rationale:**

- Fast gate catches obvious smoke failures without blocking authors.
- PR-only trigger (lines 29 in workflow) ensures this job only runs for pull requests.
- Chromium-only execution minimizes PR feedback latency.

### Rule 2: Main Branch Push Protection

**Scope:** `main` branch (post-merge validation)

**Status Check Requirement:**

```
Job Name: analytics-smoke-full
```

**Effect:**

- Direct pushes to main (or merges that bypass PR flow) must satisfy full cross-browser smoke coverage.
- Ensures main branch always passes Chromium + Firefox + WebKit tests.
- Automatically triggered on push events via workflow.

**Configuration UI Path:**

1. Repository → Settings → Branches → Add rule (or edit existing `main` rule)
2. Branch name pattern: `main`
3. Require status checks to pass before merging: ✓ Enabled
4. Search for job: `analytics-smoke-full`
5. Select: `analytics-smoke-full`
6. Require branches to be up to date before merging: ✓ Enabled

**Rationale:**

- Full cross-browser coverage catches environment-specific failures (e.g., Firefox event handling).
- Main branch pushes trigger automatic full job execution (no manual override needed).
- Protects production-ready state.

---

## Setup Instructions

### Option 1: GitHub Web UI (Recommended for Setup + Testing)

1. Navigate to your repository: `https://github.com/Arch-777/PersonalAPI`
2. Go to **Settings** tab → **Branches** (left sidebar)
3. Click **Add rule** (or edit existing `main` branch rule)

**Configure Fast Gate (PR protection):**

```
Branch name pattern: main
  ✓ Require a pull request before merging
  ✓ Require approvals (optional, depends on workflow)
  ✓ Require status checks to pass before merging
    - Search: "analytics-smoke-fast"
    - Select: "analytics-smoke-fast" (GitHub recognizes from workflow)
  ✓ Require branches to be up to date before merging
  ✓ Allow force pushes: Specify who (usually "Restrict who can force push")
  ✓ Allow deletions: Disable
  Click Create
```

**Configure Full Gate (Main protection):**

If editing the same rule, add `analytics-smoke-full` as an additional required check:

```
Require status checks to pass before merging:
  - analytics-smoke-fast (for PRs)
  - analytics-smoke-full (for push/merge)
```

> **Note:** Both jobs can coexist in a single rule. GitHub evaluates them contextually:
> - PR workflows: `analytics-smoke-fast` required (via pull_request trigger)
> - Direct push to main: `analytics-smoke-full` required (via push trigger)

---

### Option 2: GitHub CLI

If you prefer command-line setup:

**Automatic Script (Recommended)**

A setup script is provided in the repository:

**For macOS/Linux:**
```bash
chmod +x scripts/setup-branch-protection.sh
./scripts/setup-branch-protection.sh
```

**For Windows (PowerShell):**
```powershell
.\scripts\Setup-BranchProtection.ps1
```

The script will attempt to apply the rules via GitHub CLI. If it fails due to API permissions, it will display the manual fallback instructions.

**Manual gh CLI command:**

```bash
gh api repos/Arch-777/PersonalAPI/branches/main/protection \
  --method PUT \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["analytics-smoke-fast", "analytics-smoke-full"]
  },
  "enforce_admins": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

---

### Option 3: REST API (Curl)

```bash
curl -X PUT \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/Arch-777/PersonalAPI/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["analytics-smoke-fast", "analytics-smoke-full"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_review": false,
      "required_approving_review_count": 1
    },
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

---

## Verification

After applying branch protection rules:

### 1. Confirm Rules Are Active

1. Repository → Settings → Branches
2. Verify rule for `main` branch exists and shows:
   - ✓ Require status checks to pass: `analytics-smoke-fast`, `analytics-smoke-full`
   - ✓ Require branches to be up to date
   - ✓ Include administrators

### 2. Test Fast Gate (PR Protection)

1. Create a feature branch off `main`:
   ```bash
   git checkout -b test/branch-protection-fast
   echo "test" > test.txt
   git add test.txt
   git commit -m "Test PR protection"
   git push origin test/branch-protection-fast
   ```

2. Open a pull request from `test/branch-protection-fast` → `main`

3. GitHub shows PR status:
   ```
   Checks
   | analytics-smoke-fast  | ⏳ In progress...
   ```

4. Wait for job to complete:
   - ✅ If passed: Merge button becomes enabled (if other checks pass)
   - ❌ If failed: Merge button remains disabled with "Required status check failed"

5. Clean up test branch:
   ```bash
   git push origin --delete test/branch-protection-fast
   ```

### 3. Test Full Gate (Main Protection)

1. After PR merges to main, GitHub automatically triggers `analytics-smoke-full`:
   ```
   Checks
   | analytics-smoke-fast  | ✅ Passed (from PR)
   | analytics-smoke-full  | ⏳ In progress... (triggered on push)
   ```

2. Verify both jobs pass before marking main as "protected"

3. (Optional) Trigger manual full run via workflow dispatch:
   ```
   Repository → Actions → Frontend Analytics Smoke
   → Run workflow → Branch: main, Execution mode: full
   ```

---

## Common Issues & Troubleshooting

### Issue: GitHub API returns "Not Found (404)"

**Symptom:**
```
gh: Not Found (HTTP 404)
documentation_url: https://docs.github.com/rest/branches/branch-protection#update-branch-protection
```

**Cause:**
- Repository may have API permission restrictions or organizational policies
- GitHub CLI token may lack necessary scopes (typically `repo`, `admin:repo_hook` required)
- Some repository configurations don't allow programmatic branch protection changes

**Fix:**
1. Verify GitHub CLI token has proper scopes:
   ```bash
   gh auth status
   ```
   Should show: `repo`, `admin:repo_hook`, `workflow` scopes
   
2. If scopes are missing, re-authenticate:
   ```bash
   gh auth logout
   gh auth login
   # Select: HTTPS, Paste token with full `admin:repo_hook` scope
   ```

3. If API still fails, use the **GitHub Web UI** (Option 1) instead — it's the most reliable method

4. Confirm rules are applied by visiting:
   https://github.com/Arch-777/PersonalAPI/settings/branches

### Issue: "Required status check not found"

**Symptom:** 
```
analytics-smoke-fast: Required status check not found
```

**Cause:** 
- Job name in branch protection rule doesn't match workflow job name exactly.
- Workflow file has not been merged to `main` yet.

**Fix:**
1. Verify workflow file is committed to `main`:
   ```bash
   git log --oneline main -- .github/workflows/frontend-analytics-smoke.yml | head -5
   ```
2. Verify job name matches exactly:
   - Workflow: `jobs: analytics-smoke-fast:`
   - Branch protection: Search for `analytics-smoke-fast` (case-sensitive)
3. Wait ~5 minutes after first workflow run; GitHub caches job names.

### Issue: PR shows "Checks Expected" but nothing runs

**Cause:** 
- Workflow `on:` trigger doesn't match PR event.
- Frontend paths filter not matching PR changes.

**Fix:**
1. Verify PR touches `frontend/**` or `.github/workflows/frontend-analytics-smoke.yml`
2. Check workflow trigger (lines 3-8):
   ```yaml
   on:
     pull_request:
       paths:
         - "frontend/**"
         - ".github/workflows/frontend-analytics-smoke.yml"
   ```
3. If PR changes unrelated paths, workflow won't trigger (expected behavior).

### Issue: "analytics-smoke-full requires up-to-date branches"

**Symptom:**
```
Required status check "analytics-smoke-full" is expected
You don't have permission to merge this branch
```

**Cause:**
- Your local branch is behind main (commit history diverged).
- Branch protection rule requires up-to-date before merge.

**Fix:**
1. Rebase onto latest main:
   ```bash
   git fetch origin main
   git rebase origin/main
   git push origin HEAD --force-with-lease
   ```
2. This triggers smoke checks again (fast for PR, full after merge).

### Issue: Full job didn't run after merge

**Cause:**
- Push event to `main` didn't match path filter.

**Fix:**
1. Check if changes touched `frontend/**`:
   ```bash
   git diff main~1..main -- frontend/
   ```
2. If not, manually trigger via workflow dispatch:
   - Repository → Actions → Frontend Analytics Smoke
   - Run workflow → `run_mode: full`

---

## Best Practices

1. **Pair Rules:**
   - Always require both `analytics-smoke-fast` (PR gate) and `analytics-smoke-full` (main validation).
   - This ensures:
     - Contributors get quick feedback on PRs (fast only).
     - Main branch always passes full cross-browser coverage (full only).

2. **Bypass Only for Hotfixes:**
   - Grant "Allow force pushes" only to admins.
   - Require code owner review before admin bypass.
   - Log rationale for bypassing in PR comment.

3. **Monitor Flakiness:**
   - If `analytics-smoke-full` fails >10% of merges, investigate:
     - Environment-specific issues (Firefox driver, WebKit rendering).
     - Test assertion brittleness (timing, selectors).
     - File issues and update smoke spec (see [ANALYTICS_SMOKE_FLOW.md](ANALYTICS_SMOKE_FLOW.md)).

4. **Update Rules When Workflow Changes:**
   - If you rename or remove jobs in the workflow, update branch protection rules to match.
   - Example: If `analytics-smoke-fast` is renamed to `smoke-fast-gate`, update the rule immediately.

---

## Integration with CI/CD Workflow

Branch protection rules work in tandem with the workflow logic:

```
PR created (frontend/ changes)
    ↓
trigger: pull_request
    ↓
Job: analytics-smoke-fast (Chromium only)
    ↓
Branch protection: REQUIRE analytics-smoke-fast ✓
    ↓
Merge button enabled/disabled based on result
    ↓
If merged → trigger: push to main
    ↓
Job: analytics-smoke-full (all browsers)
    ↓
Branch protection: REQUIRE analytics-smoke-full ✓
    ↓
Main branch marked as passing/failing
```

For additional workflow details, see [ANALYTICS_SMOKE_FLOW.md](ANALYTICS_SMOKE_FLOW.md).

---

## References

- [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub API: Update branch protection](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28)
- [GitHub CLI: Branch protection commands](https://cli.github.com/manual/gh_repo_edit)
- Workflow file: [.github/workflows/frontend-analytics-smoke.yml](.github/workflows/frontend-analytics-smoke.yml)
- Related docs: [ANALYTICS_SMOKE_FLOW.md](ANALYTICS_SMOKE_FLOW.md), [API_INTEGRATION.md](API_INTEGRATION.md)
