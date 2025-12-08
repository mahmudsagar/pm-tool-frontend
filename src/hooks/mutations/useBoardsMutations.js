import { useMutation, useQueryClient } from '@tanstack/react-query';
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/page/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/board?id=${boardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update board');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/board?id=${boardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete board');
      return response.json();
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
