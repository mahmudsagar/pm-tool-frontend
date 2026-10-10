import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';

/**
 * Validates the persisted token with the server once per session and refreshes
 * the user and workspace list from the response. An invalid token logs out via the API client.
 */
export const useInitAuth = () => {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: ['auth', 'init', token],
    queryFn: async () => {
      const payload = await http.get('/v1/auth');
      useAuthStore.getState().applyServerSession(payload);
      return payload;
    },
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
};
