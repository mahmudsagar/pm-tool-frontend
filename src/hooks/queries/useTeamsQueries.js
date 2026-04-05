import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';

/**
 * Fetch all teams for the current user
 */
const fetchTeams = async () => {
  const result = await api.get(`${baseUrl}/v1/team`);
  return result.data;
};

/**
 * Query hook to get all teams
 */
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Query hook to get a specific team by ID
 */
export const useTeamById = (teamId) => {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: async () => {
      const result = await api.get(`${baseUrl}/v1/team/${teamId}`);
      return result.data;
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
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
