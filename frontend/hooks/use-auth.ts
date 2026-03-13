import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export const useUser = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
       const { data } = await apiClient.get('/auth/me');
       return data;
    },
    retry: false,
  });
};

export const useLogin = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const { data } = await apiClient.post('/auth/login', credentials);
            return data;
        },
        onSuccess: (data) => {
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', data.access_token);
            }
            queryClient.invalidateQueries({ queryKey: ['me'] });
            router.push('/dashboard');
        }
    });
};

export const useSignup = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async (userData: { email: string; password: string; full_name: string }) => {
            // First register the user (returns 201 without access token)
            await apiClient.post('/auth/register', userData);
            
            // Automatically log them in to get the access token
            const { data } = await apiClient.post('/auth/login', {
                email: userData.email,
                password: userData.password,
            });
            return data;
        },
        onSuccess: (data) => {
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', data.access_token);
            }
            queryClient.invalidateQueries({ queryKey: ['me'] });
            router.push('/dashboard');
        }
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async () => {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('access_token');
            }
        },
        onSuccess: () => {
            queryClient.clear();
            router.push('/');
        }
    });
};
