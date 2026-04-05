import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
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
      const result = await api.post(`${baseUrl}/v1/team`, teamData);
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
      const result = await api.put(`${baseUrl}/v1/team/${teamId}`, data);
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
      return api.delete(`${baseUrl}/v1/team/${teamId}`);
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
      return api.post(`${baseUrl}/v1/team/${teamId}/members`, { userId });
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
      return api.delete(`${baseUrl}/v1/team/${teamId}/members/${userId}`);
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
