import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';

/**
 * Query hook to get a specific board by ID
 */
export const useBoard = (boardId) => {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/board?id=${boardId}`);
      return result.data;
    },
    enabled: !!boardId,
    staleTime: 2 * 60 * 1000, // 2 minutes - boards change frequently
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
