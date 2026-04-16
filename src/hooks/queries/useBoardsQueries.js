import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import qs from 'qs';

/**
 * Query hook to get a specific board by ID, with optional server-side view (sort/filter/search).
 * @param {string} boardId
 * @param {{ sorts?: Array, filters?: Array, search?: string }} [viewState]
 */
export const useBoard = (boardId, viewState) => {
  return useQuery({
    queryKey: ['boards', boardId, viewState],
    queryFn: async () => {
      const params = { id: boardId };
      if (viewState?.sorts?.length)   params.sorts   = viewState.sorts;
      if (viewState?.filters?.length) params.filters = viewState.filters;
      if (viewState?.search)          params.search  = viewState.search;
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
