import { apiClient } from '@/lib/api-client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export interface SearchResult {
  id: string;
  type: string;
  source: string;
  title?: string;
  preview: string;
  score: number;
  metadata?: Record<string, unknown>;
  item_date?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  count: number;
}

interface UseSearchOptions {
  query: string;
  topK?: number;
  typeFilter?: string | null;
}

export const useSearch = ({ query, topK = 10, typeFilter = null }: UseSearchOptions) => {
  return useQuery<SearchResponse | null, Error>({
    queryKey: ['search', query, topK, typeFilter],
    queryFn: async () => {
      if (!query.trim()) return null;
      
      const params = new URLSearchParams({
        q: query,
        top_k: topK.toString(),
      });
      if (typeFilter) params.append('type_filter', typeFilter);

      const { data } = await apiClient.get(`/v1/search/?${params.toString()}`);
      return data;
    },
    enabled: !!query.trim(),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute
    retry: 3, // Auto retry
  });
};
