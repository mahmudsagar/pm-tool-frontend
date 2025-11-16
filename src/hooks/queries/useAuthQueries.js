import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';

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
