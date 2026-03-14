import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  return useQuery<Connector[], Error>({
    queryKey: ['connectors'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/v1/connectors/');
        return data as Connector[];
      } catch (error) {
        console.error("Error fetching connectors, falling back to mock", error);
        return [] as Connector[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
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
    },
    retry: 1, // Auto retry once
    onError: (error) => {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to get connection URL');
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
    retry: 2, // Auto retry
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      toast.success(`${variables} sync started`);
    },
    onError: (error, variables) => {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || `Failed to sync ${variables}`);
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
    retry: 2, // Auto retry
    onMutate: async (newParams) => {
      await queryClient.cancelQueries({ queryKey: ['connectors'] });
      const previousConnectors = queryClient.getQueryData<Connector[]>(['connectors']);

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
      return { previousConnectors };
    },
    onError: (error, newParams, context) => {
      if (context?.previousConnectors) {
        queryClient.setQueryData(['connectors'], context.previousConnectors);
      }
      const err = error as Error & { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to toggle auto sync');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
    },
    onSuccess: (serverData, variables) => {
      queryClient.setQueryData<Connector[]>(['connectors'], (old) => {
        if (!old) return old;
        return old.map((connector) => {
          if (connector.platform !== variables.platform) return connector;

          const serverConnector =
            serverData && typeof serverData === 'object' && 'platform' in serverData
              ? (serverData as Connector)
              : null;

          return {
            ...(serverConnector ?? connector),
            platform: connector.platform,
            auto_sync_enabled: variables.enabled,
          };
        });
      });
      toast.success(`Auto sync ${variables.enabled ? 'enabled' : 'disabled'} for ${variables.platform}`);
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
    retry: 2, // Auto retry
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['connectors'] });
      toast.success(`Disconnected ${variables.platform} successfully`);
    },
    onError: (error, variables) => {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || `Failed to disconnect ${variables.platform}`);
    }
  });
};
