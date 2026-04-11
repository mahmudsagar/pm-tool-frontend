import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { historyBaseUrl } from '@/utils/constants';

/**
 * Query hook to fetch version history for a page.
 */
export const usePageHistory = (pageId, { enabled = true } = {}) => {
  return useQuery({
    queryKey: ['history', pageId],
    queryFn: async () => {
      const result = await api.get(`${historyBaseUrl}?page_id=${pageId}`);
      return result.data;
    },
    enabled: !!pageId && enabled,
    staleTime: 30 * 1000,
    retry: false,
  });
};
