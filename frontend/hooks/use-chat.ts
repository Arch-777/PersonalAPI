import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ChatSource {
  id: string;
  type: string;
  source: string;
  score: number;
  preview: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  created_at?: string;
  documents?: string[];
  file_links?: string[];
}

export interface ChatResponse {
  session_id: string;
  answer: string;
  sources: ChatSource[];
  documents: string[];
  file_links: string[];
}

export interface SendMessagePayload {
  message: string;
  session_id?: string | null;
}

export const useChatHistory = (sessionId: string | null | undefined, limit = 50, order: 'asc' | 'desc' = 'asc') => {
  return useQuery({
    queryKey: ['chat-history', sessionId || 'all', limit, order],
    queryFn: async (): Promise<ChatMessage[]> => {
      const url = sessionId ? `/v1/chat/${sessionId}/history` : `/v1/chat/history`;
      const { data } = await apiClient.get(url, {
        params: { limit, order },
      });
      return data;
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<ChatResponse> => {
      const { data } = await apiClient.post('/v1/chat/message', payload);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate chat history to trigger refresh
      const sessionId = data.session_id;
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['chat-history', sessionId] });
      }
    },
  });
};
