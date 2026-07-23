import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { chatSpaceItemsBaseUrl } from '@/utils/constants';

export const useSpaceItemSearch = (spaceId, query, enabled = true) => {
  return useQuery({
    queryKey: ['chat', 'space-items', spaceId, query],
    queryFn: async () => {
      const params = new URLSearchParams({ space_id: spaceId });
      if (query?.trim()) params.set('query', query.trim());
      const result = await api.get(`${chatSpaceItemsBaseUrl}?${params}`);
      return result.data ?? [];
    },
    enabled: !!spaceId && enabled,
    staleTime: 15 * 1000,
  });
};
