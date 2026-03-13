// Placeholder for search hook
import { useQuery } from '@tanstack/react-query';
// import { apiClient } from '@/lib/api-client';

export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
         if (!query) return [];
        // const { data } = await apiClient.get(`/search?q=${query}`);
        // return data;
        return [];
    },
    enabled: !!query,
  });
};
