import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

export const useChatHistory = (
  sessionId: string | null | undefined, 
  limit = 50, 
  order: 'asc' | 'desc' = 'asc'
) => {
  return useQuery<ChatMessage[], Error>({
    queryKey: ['chat-history', sessionId || 'all', limit, order],
    queryFn: async () => {
      const url = sessionId ? `/v1/chat/${sessionId}/history` : `/v1/chat/history`;
      const { data } = await apiClient.get(url, {
        params: { limit, order },
      });
      return data;
    },
    staleTime: 60 * 1000, // 1 minute
    retry: 3, // Auto retry
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      const { data } = await apiClient.post('/v1/chat/message', payload);
      return data;
    },
    retry: 2, // Auto retry 2 times on mutation failure
    onSuccess: (data) => {
      // Invalidate chat history to trigger refresh
      const sessionId = data.session_id;
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['chat-history', sessionId] });
      }
    },
    onError: (error) => {
      const err = error as Error & { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to send message');
    }
  });
};
