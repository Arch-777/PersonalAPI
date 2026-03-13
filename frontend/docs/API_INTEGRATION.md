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
