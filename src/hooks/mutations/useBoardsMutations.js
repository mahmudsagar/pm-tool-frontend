import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

/**
 * Mutation hook to create a task/document in a board
 */
export const useCreateBoardTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ boardId, taskData }) => {
      const result = await api.post(`${baseUrl}/v1/page/document`, taskData);
      return result.data;
    },
    
    onSuccess: async (_, variables) => {
      // Invalidate and refetch immediately to show new task
      await queryClient.invalidateQueries({ 
        queryKey: ['boards', variables.boardId],
        refetchType: 'active'
      });
      await queryClient.refetchQueries({ 
        queryKey: ['boards', variables.boardId],
        type: 'active'
      });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast({ title: 'Task created successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to create task',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to update a board
 */
export const useUpdateBoard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ boardId, data }) => {
      const result = await api.put(`${baseUrl}/v1/board?id=${boardId}`, data);
      return result.data;
    },
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
      toast({ title: 'Board updated successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to update board',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to delete a board
 */
export const useDeleteBoard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (boardId) => {
      return api.delete(`${baseUrl}/v1/board?id=${boardId}`);
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Board deleted successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to delete board',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
