import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Connector {
  id?: string;
  platform: string;
  platform_email?: string;
  status: string;
  last_synced?: string;
  error_message?: string;
  auto_sync_enabled?: boolean;
}

export const useConnectors = () => {
  return useQuery({
    queryKey: ['connectors'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/v1/connectors/');
        return data as Connector[];
      } catch (error) {
        console.error("Error fetching connectors, falling back to mock", error);
        return [] as Connector[];
      }
    }
  });
};

export const useGetConnectUrl = () => {
  return useMutation({
    mutationFn: async (platform: string) => {
      let url = `/v1/connectors/${platform}/connect`;
      if (['gmail', 'drive', 'gcal'].includes(platform)) {
        url = `/v1/connectors/google/connect?platform=${platform}`;
      }
      const { data } = await apiClient.get(url);
      return data.url;
    }
  });
};

export const useSyncConnector = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: string) => {
      const { data } = await apiClient.post(`/v1/connectors/${platform}/sync`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    }
  });
};

export interface ToggleAutoSyncParams {
  platform: string;
  enabled: boolean;
  cascade_google?: boolean;
}

export const useToggleAutoSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ platform, enabled, cascade_google = true }: ToggleAutoSyncParams) => {
      const { data } = await apiClient.patch(`/v1/connectors/${platform}/auto-sync`, {
        enabled,
        cascade_google
      });
      return data;
    },
    onMutate: async (newParams) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['connectors'] });

      // Snapshot the previous value
      const previousConnectors = queryClient.getQueryData<Connector[]>(['connectors']);

      // Optimistically update to the new value
      if (previousConnectors) {
        queryClient.setQueryData<Connector[]>(['connectors'], (old) => {
          if (!old) return old;
          return old.map(connector => 
            connector.platform === newParams.platform 
              ? { ...connector, auto_sync_enabled: newParams.enabled }
              : connector
          );
        });
      }

      // Return a context object with the snapshotted value
      return { previousConnectors };
    },
    onError: (err, newParams, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConnectors) {
        queryClient.setQueryData(['connectors'], context.previousConnectors);
      }
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    }
  });
};

export interface DisconnectConnectorParams {
  platform: string;
  delete_data?: boolean;
  cascade_google?: boolean;
}

export const useDisconnectConnector = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ platform, delete_data = false, cascade_google = true }: DisconnectConnectorParams) => {
      const searchParams = new URLSearchParams();
      if (delete_data) searchParams.append('delete_data', 'true');
      if (cascade_google) searchParams.append('cascade_google', 'true');
      
      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const { data } = await apiClient.delete(`/v1/connectors/${platform}${queryString}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    }
  });
};
