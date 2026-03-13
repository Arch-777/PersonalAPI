// Placeholder for auth hook
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery } from '@tanstack/react-query';

export const useUser = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
       // Mock or real endpoint
       // const { data } = await apiClient.get('/users/me');
       // return data;
       return { id: '1', name: 'Demo User', email: 'demo@example.com' };
    },
  });
};

export const useLogin = () => {
    return useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const { data } = await apiClient.post('/auth/token', credentials);
            return data;
        },
        onSuccess: (data) => {
            localStorage.setItem('access_token', data.access_token);
        }
    });
};
