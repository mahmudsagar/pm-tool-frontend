import { useMutation, useQueryClient } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

/**
 * Mutation hook to create a new space
 */
export const useCreateSpace = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (spaceData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/space`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(spaceData),
      });
      
      if (!response.ok) throw new Error('Failed to create space');
      const result = await response.json();
      return result.data;
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      toast({ title: 'Space created successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to create space',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to update a space
 */
export const useUpdateSpace = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ spaceId, data }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/space/${spaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update space');
      const result = await response.json();
      return result.data;
    },
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['spaces', variables.spaceId] });
      toast({ title: 'Space updated successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to update space',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to delete a space
 */
export const useDeleteSpace = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (spaceId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/space/${spaceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete space');
      return response.json();
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast({ title: 'Space deleted successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to delete space',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
