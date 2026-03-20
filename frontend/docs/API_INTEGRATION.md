# API Integration Strategy

We use **TanStack Query (React Query)** to interface with the Python FastAPI backend.

## 1. Setup

*   **Backend URL**: `http://localhost:8000` (or env var `NEXT_PUBLIC_API_URL`).
*   **Client**: `QueryClient` configured with:
    *   `staleTime`: 5 minutes (data remains fresh).
    *   `refetchOnWindowFocus`: False (prevent annoying refetches).

## 2. Authentication

*   **Mechanism**: JWT Tokens.
*   **Storage**: `localStorage` (access_token) or HttpOnly Cookie (preferred if backend supports).
*   **Interceptor**: `lib/api-client.ts` automatically attaches `Authorization: Bearer <token>` to requests.

## 3. React Query Hooks

Create custom hooks in `hooks/` folder for cleaner components:

```typescript
// Example: hooks/use-integrations.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useIntegrations = () => {
    return useQuery({
        queryKey: ['integrations'],
        queryFn: async () => {
            const { data } = await apiClient.get('/connectors');
            return data;
        },
    });
};

export const useConnectIntegration = () => {
    return useMutation({
        mutationFn: async (payload: { type: string; config: any }) => {
            return await apiClient.post('/connectors', payload);
        },
        onSuccess: () => {
             // Invalidate query to refresh list
             queryClient.invalidateQueries({ queryKey: ['integrations'] });
        }
    });
};
```

## 4. Error Handling

*   **Global**: `QueryCache` global callbacks for 401 (Unauthorized) -> Redirect to Login.
*   **Local**: Use `isError` and `error` properties from hooks to show alerts in UI.

## 5. Developer Analytics Integration

Use dashboard analytics endpoints to power usage widgets.

### Hook contract

Create `hooks/use-developer-analytics.ts` with three read hooks:

* `useDeveloperAnalyticsSummary(windowDays)` -> `/v1/developer/analytics/summary`
* `useDeveloperAnalyticsTimeseries(windowDays, granularity)` -> `/v1/developer/analytics/timeseries`
* `useDeveloperAnalyticsBreakdown(windowDays, topPaths)` -> `/v1/developer/analytics/breakdown`

Recommended query keys:

* `['developer-analytics', 'summary', windowDays]`
* `['developer-analytics', 'timeseries', windowDays, granularity]`
* `['developer-analytics', 'breakdown', windowDays, topPaths]`

### Widget mapping

Map response fields directly to dashboard widgets:

* KPI cards
    * `total_requests` -> Requests
    * `error_rate` -> Error Rate
    * `average_latency_ms` -> Avg Latency
    * `p95_latency_ms` -> P95 Latency
* Trend chart
    * x-axis -> `points[].bucket_start`
    * y-axis series 1 -> `points[].total_requests`
    * y-axis series 2 -> `points[].error_requests`
* Breakdowns
    * Status chips/table -> `status[]`
    * Top path list/table -> `paths[]`

### UX guidance

* Keep analytics section non-blocking; load independently from connectors/chat.
* Use graceful fallback text (`No analytics yet`) when arrays are empty.
* Default to `window_days=30`, with optional UI controls for 7/30/90 day views.
* Expose granularity toggle (`hour` / `day`) for trend charts.
* Show loading skeletons while analytics queries are pending to avoid layout shifts.

### Reliability telemetry

Dashboard analytics panels emit lightweight client-side counters for reliability tracking:

* Error counters per panel (`summary`, `trend`, `status`, `paths`)
* Retry counters per panel (`summary`, `trend`, `status`, `paths`)

Implementation:

* Utility: `lib/analytics-panel-telemetry.ts`
* Storage: `localStorage` key `dashboard_analytics_telemetry_v1`
* Trigger points: panel error rendering and retry button actions in `app/dashboard/page.tsx`
