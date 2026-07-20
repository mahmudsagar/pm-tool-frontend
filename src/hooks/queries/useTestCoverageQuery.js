import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import qs from 'qs';

export function useTestCoverage(boardId, { sprint, enabled = true } = {}) {
  return useQuery({
    queryKey: ['test-coverage', boardId, sprint || 'all'],
    queryFn: async () => {
      const params = { board_id: boardId };
      if (sprint) params.sprint = sprint;
      const queryString = qs.stringify(params, { encode: false });
      const result = await api.get(`${baseUrl}/v1/test-coverage?${queryString}`);
      return result.data || { by_sprint: {}, regressions: [], snapshots: [] };
    },
    enabled: Boolean(boardId) && enabled,
    staleTime: 30 * 1000,
  });
}
