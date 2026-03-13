// Placeholder for integrations hook
import { useQuery } from '@tanstack/react-query';
// import { apiClient } from '@/lib/api-client';

export const useConnectors = () => {
  return useQuery({
    queryKey: ['connectors'],
    queryFn: async () => {
        // const { data } = await apiClient.get('/connectors');
        // return data;
        return [
            { id: 'notion', name: 'Notion', connected: true },
            { id: 'slack', name: 'Slack', connected: false }
        ];
    }
  });
};
