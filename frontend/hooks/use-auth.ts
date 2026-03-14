import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface User {
    id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    is_superuser: boolean;
}

export const useUser = () => {
    return useQuery<User, Error>({
        queryKey: ['me'],
        queryFn: async () => {
            const { data } = await apiClient.get('/auth/me');
            return data;
        },
        retry: 3, // Auto-retry on query failure
        staleTime: 5 * 60 * 1000, // 5 minutes
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
        retry: 2, // Auto retry on mutation failure
        onSuccess: (data) => {
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', data.access_token);
            }
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Successfully logged in');
            router.push('/dashboard');
        },
        onError: (error) => {
            const err = error as Error & { response?: { data?: { detail?: string } } };
            const message = err.response?.data?.detail || 'Failed to login';
            toast.error(message);
        }
    });
};

export const useSignup = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async (userData: { email: string; password: string; full_name: string }) => {
            await apiClient.post('/auth/register', userData);
            try {
                const { data } = await apiClient.post('/auth/login', {
                    email: userData.email,
                    password: userData.password,
                });
                return data;
            } catch {
                throw new Error('SIGNUP_LOGIN_FAILED');
            }
        },
        retry: 2,
        onSuccess: (data) => {
            if (typeof window !== 'undefined') {
                localStorage.setItem('access_token', data.access_token);
            }
            queryClient.invalidateQueries({ queryKey: ['me'] });
            toast.success('Account created successfully');
            router.push('/dashboard');
        },
        onError: (error) => {
            const err = error as Error & { response?: { data?: { detail?: string } } };
            const message = err.message === 'SIGNUP_LOGIN_FAILED' 
                ? 'Account created but automatic login failed.' 
                : err.response?.data?.detail || 'Failed to sign up';
            toast.error(message);
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
            toast.success('Logged out successfully');
            router.push('/');
        },
        onError: () => {
            toast.error('Failed to log out');
        }
    });
};
