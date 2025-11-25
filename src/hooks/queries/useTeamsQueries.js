import { useQuery } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';

/**
 * Fetch all teams for the current user
 */
const fetchTeams = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${baseUrl}/v1/team`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) throw new Error('Failed to fetch teams');
  const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team/${teamId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch team');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team/${teamId}/members`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch team members');
      const result = await response.json();
      return result.data;
    },
    enabled: !!teamId,
  });
};
