import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import qs from 'qs';

const narrowBoardView = (v) => {
  if (!v) return { sorts: [], filters: [], search: '' };
  return {
    sorts: v.sorts ?? [],
    filters: v.filters ?? [],
    search: v.search ?? '',
  };
};

/**
 * Query hook to get a specific board by ID, with optional server-side view (sort/filter/search).
 * @param {string} boardId
 * @param {{ sorts?: Array, filters?: Array, search?: string }} [viewState]
 */
export const useBoard = (boardId, viewState) => {
  const narrow = narrowBoardView(viewState);
  return useQuery({
    queryKey: ['boards', boardId, narrow],
    queryFn: async () => {
      const params = { id: boardId };
      if (narrow.sorts?.length)   params.sorts   = narrow.sorts;
      if (narrow.filters?.length) params.filters = narrow.filters;
      if (narrow.search)          params.search  = narrow.search;
      const queryString = qs.stringify(params, { arrayFormat: 'brackets', encode: false });
      const result = await api.get(`${baseUrl}/v1/board?${queryString}`);
      return result.data;
    },
    enabled: !!boardId,
    staleTime: 0, // always refetch when viewState changes
  });
};

/**
 * Query hook to get all boards
 */
export const useBoards = () => {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/board`);
      return result.data;
    },
    staleTime: 3 * 60 * 1000,
  });
};
