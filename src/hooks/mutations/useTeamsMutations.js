import { useMutation, useQueryClient } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

/**
 * Mutation hook to create a new team
 */
export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (teamData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
      });
      
      if (!response.ok) throw new Error('Failed to create team');
      const result = await response.json();
      return result.data;
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team created successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to create team',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to update a team
 */
export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ teamId, data }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update team');
      const result = await response.json();
      return result.data;
    },
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
      toast({ title: 'Team updated successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to update team',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to delete a team
 */
export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (teamId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete team');
      return response.json();
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({ title: 'Team deleted successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to delete team',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to add member to team
 */
export const useAddTeamMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ teamId, userId }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) throw new Error('Failed to add team member');
      return response.json();
    },
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId, 'members'] });
      toast({ title: 'Member added successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to add member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to remove member from team
 */
export const useRemoveTeamMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ teamId, userId }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/team/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to remove team member');
      return response.json();
    },
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId, 'members'] });
      toast({ title: 'Member removed successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
