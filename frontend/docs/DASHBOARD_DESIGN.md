# Dashboard Structure & Design

The dashboard is the authenticated area for managing data and connectors.

## 1. Layout Structure

*   **Sidebar (Left/Collapsible)**
    *   **Brand Logo**: Top left.
    *   **Navigation Links**:
        *   Home (Icon: Home)
        *   Search (Icon: Search)
        *   Integrations (Icon: Plug/Link) - *Connect Notion, Slack, etc.*
        *   Pricing & Plans (Icon: CreditCard)
        *   API & Tokens (Icon: Key) - *For OpenClaw / n8n*
        *   Settings (Icon: Settings)
    *   **User Profile**: Bottom left (Avatar + Name).

*   **Main Content Area (Right)**
    *   Dynamic content/page based on selection.
    *   Padding: 24px (desktop), 16px (mobile).

## 2. Page Specifics

### Home Page
*   **Welcome Message**: "Good morning, [User]."
*   **Quick Stats**: "1,204 Documents Indexed", "5 Connected Apps".
*   **Recent Activity**: List of latest synced items.
*   **Developer Analytics Panel**:
    *   Window selector chips: `7d`, `30d`, `90d`.
    *   Granularity selector chips: `hour`, `day`.
    *   KPI cards for requests, error rate, average latency, and p95 latency.
    *   Trend chart for request volume over time.
    *   Status and top-path breakdown lists.
    *   Skeleton placeholders while loading and dashed-card empty states when data is unavailable.

#### Developer Analytics Data Mapping

*   **Summary endpoint** (`GET /v1/developer/analytics/summary`)
    *   `total_requests` -> Requests KPI
    *   `error_rate` -> Error Rate KPI
    *   `average_latency_ms` -> Avg Latency KPI
    *   `p95_latency_ms` -> P95 Latency KPI
*   **Timeseries endpoint** (`GET /v1/developer/analytics/timeseries`)
    *   `points[].bucket_start` -> chart x-axis
    *   `points[].total_requests` -> volume line
    *   `points[].error_requests` -> errors line
*   **Breakdown endpoint** (`GET /v1/developer/analytics/breakdown`)
    *   `status[]` -> status bucket summary
    *   `paths[]` -> top endpoints list with error/latency columns

### Search Page
*   **Central Input**: Large search bar (Cmd+K style).
*   **Filters**: "Type: Document", "Source: Notion", "Date: Last Week".
*   **Results**:
    *   List view of matching items with snippets.
    *   "Ask AI" button to trigger RAG chat on results.

### Integrations Page
*   **Grid Layout**: Cards for each service (Notion, Slack, Telegram, etc.).
*   **Status Indicators**:
    *   *Green Dot*: Connected & Synced.
    *   *Gray/Outlined*: Not Connected.
    *   *Spinning*: Syncing.
*   **Action**: "Connect" button opens OAuth popup or API Key input modal.

### API & Tokens Page
*   **Purpose**: Manage access for external agents (OpenClaw) and automation (n8n).
*   **List View**: Table of active keys.
    *   Columns: Name, Prefix (sk-...), Created At, Last Used, Actions (Revoke).
*   **Create Token**: Button to generate new long-lived token.

### Pricing & Plans
*   **Current Plan** status.
*   **Upgrade Options**: Stripe integration (or similar).

### Settings / Profile
*   **Profile Form**: Name, Email (Read-only), Avatar upload.
*   **Preferences**: Theme (Light/Dark), Notification settings.
