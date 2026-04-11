import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';

/**
 * Fetch all spaces for the current user
 */
const fetchSpaces = async (userId) => {
  const url = userId
    ? `${baseUrl}/v1/space?user_id=${userId}`
    : `${baseUrl}/v1/space`;
  const result = await api.get(url);
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
      const result = await api.get(`${baseUrl}/v1/space/${spaceId}`);
      return result.data;
    },
    enabled: !!spaceId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Query hook to search workspace members by email/name
 */
export const useSearchWorkspaceMembers = (search) => {
  return useQuery({
    queryKey: ['workspace-members', 'search', search],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/workspace/member?search=${encodeURIComponent(search)}`);
      const d = result.data;
      if (!d) return [];
      // Flatten { owner, members } shape into a single array
      if (Array.isArray(d)) return d;
      const list = [];
      if (d.owner) list.push(d.owner);
      if (Array.isArray(d.members)) list.push(...d.members);
      return list;
    },
    enabled: search.trim().length > 0,
    staleTime: 30 * 1000,
  });
};

/**
 * Query hook to search users by email/name (for workspace member picker)
 */
export const useSearchUsers = (search) => {
  return useQuery({
    queryKey: ['users', 'search', search],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/workspace/member?search=${encodeURIComponent(search)}`);
      return result.data ?? [];
    },
    enabled: search.trim().length > 0,
    staleTime: 30 * 1000,
  });
};

/**
 * Query hook to get all workspace members
 */
export const useWorkspaceMembers = () => {
  return useQuery({
    queryKey: ['workspace-members'],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/workspace/member`);
      const d = result.data;
      if (!d) return [];
      // Flatten { owner, members } shape into a single array
      if (Array.isArray(d)) return d;
      const list = [];
      if (d.owner) list.push(d.owner);
      if (Array.isArray(d.members)) list.push(...d.members);
      return list;
    },
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
      const result = await api.get(`${baseUrl}/v1/workspace/member`);
      return result.data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - users don't change often
  });
};
