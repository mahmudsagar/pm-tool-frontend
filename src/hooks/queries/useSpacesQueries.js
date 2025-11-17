import { useQuery } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';

/**
 * Fetch all spaces for the current user
 */
const fetchSpaces = async (userId) => {
  const token = localStorage.getItem('token');
  
  // Build URL with optional user_id query parameter
  const url = userId 
    ? `${baseUrl}/v1/space?user_id=${userId}`
    : `${baseUrl}/v1/space`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch spaces');
  const result = await response.json();
  return result.data;
};

/**
 * Query hook to get all spaces
 * @param {string} userId - Optional user ID to filter spaces
 */
export const useSpaces = (userId) => {
  return useQuery({
    queryKey: ['spaces', userId],
    queryFn: () => fetchSpaces(userId),
    enabled: !!userId, // Only fetch when userId is available
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Query hook to get a specific space by ID
 */
export const useSpaceById = (spaceId) => {
  return useQuery({
    queryKey: ['spaces', spaceId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/space/${spaceId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch space');
      const result = await response.json();
      return result.data;
    },
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Query hook to get users (for space management)
 */
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/user`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - users don't change often
  });
};
