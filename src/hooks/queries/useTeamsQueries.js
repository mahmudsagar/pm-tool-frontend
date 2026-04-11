import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';

/**
 * Fetch all teams for the current user
 */
const fetchTeams = async () => {
  const result = await api.get(`${baseUrl}/v1/workspace/team`);
  return result.data;
};

/**
 * Query hook to get all teams
 */
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Query hook to get all workspace teams (replaces per-user team fetch)
 */
export const useTeamsByUser = (_userId) => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Query hook to get a specific team by ID (query-param style)
 */
export const useTeamById = (teamId) => {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/team?id=${teamId}`);
      return result.data;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Query hook to search workspace teams by name
 */
export const useSearchTeams = (_userId, search) => {
  return useQuery({
    queryKey: ['teams', 'search', search],
    queryFn: async () => {
      const result = await api.get(
        `${baseUrl}/v1/workspace/team?search=${encodeURIComponent(search)}`
      );
      return result.data ?? [];
    },
    enabled: search.trim().length >= 2,
    staleTime: 30 * 1000,
  });
};

/**
 * Query hook to get team members
 */
export const useTeamMembers = (teamId) => {
  return useQuery({
    queryKey: ['teams', teamId, 'members'],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/team/${teamId}/members`);
      return result.data;
    },
    enabled: !!teamId,
  });
};
