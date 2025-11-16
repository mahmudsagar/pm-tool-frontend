import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import useAuthStore from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';

/**
 * Mutation hook for user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { login } = useAuthStore();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ email, password }) => 
      api.post(import.meta.env.BN_BASE_URL + '/v1/auth/login', 
        { email, password }, 
        { requireAuth: false }
      ),
    
    onSuccess: (data) => {
      if (data.status === "success" && data.data) {
        login(data.data.token, data.data.user_info);
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        toast({ title: 'Login successful' });
      }
    },
    
    onError: (error) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Please check your credentials',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook for user logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.post(import.meta.env.BN_BASE_URL + '/v1/auth/logout'),
    
    onSuccess: () => {
      logout();
      queryClient.clear(); // Clear all cached data on logout
      toast({ title: 'Logged out successfully' });
    },
    
    onError: (error) => {
      // Still logout even if API call fails
      logout();
      queryClient.clear();
      toast({
        title: 'Logged out',
        description: error.message,
      });
    },
  });
};

/**
 * Mutation hook for user registration
 */
export const useRegister = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ email, password, name }) =>
      api.post(import.meta.env.BN_BASE_URL + '/v1/auth/register', 
        { email, password, name }, 
        { requireAuth: false }
      ),
    
    onSuccess: (data) => {
      const description = Array.isArray(data.message?.[0]?.success) 
        ? data.message[0].success[0] 
        : "Your account has been created";
      
      toast({ 
        title: 'Registration successful',
        description 
      });
    },
    
    onError: (error) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive',
      });
    },
  });
};
