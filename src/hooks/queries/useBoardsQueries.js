import { useQuery } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';

/**
 * Query hook to get a specific board by ID
 */
export const useBoard = (boardId) => {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/board?id=${boardId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch board');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/board`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch boards');
      const result = await response.json();
      return result.data;
    },
    staleTime: 3 * 60 * 1000,
  });
};
