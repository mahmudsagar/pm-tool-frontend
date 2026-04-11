import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { authBaseUrl } from '@/utils/constants';
import useAuthStore from '@/stores/useAuthStore';

/**
 * Query to initialize auth by validating the token against the server.
 * Replaces the async initializeAuth fetch so TanStack Query can deduplicate
 * concurrent calls (e.g. React StrictMode double-invocation).
 */
export const useInitAuth = () => {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['auth', 'init'],
    queryFn: async () => {
      const data = await api.get(authBaseUrl);
      if (data.status === 'success' && data.data) {
        const { setUser, setToken } = useAuthStore.getState();
        setUser(data.data.user_info);
        setToken(token);
        return data.data;
      }
      throw new Error('Invalid auth response');
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000, // 10 minutes — won't re-fetch on every mount
    retry: false,
  });
};

/**
 * Query to validate the current auth token
 * @param {boolean} enabled - Whether the query should run
 */
export const useValidateToken = (enabled = true) => {
  return useQuery({
    queryKey: ['auth', 'validate'],
    queryFn: () => api.get('/api/auth/validate'),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry token validation
  });
};

/**
 * Query to get the current authenticated user
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['auth', 'user'],
    queryFn: () => api.get('/api/auth/me'),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};
