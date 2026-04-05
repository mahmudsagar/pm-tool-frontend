import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
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
      const result = await api.post(`${baseUrl}/v1/space`, spaceData);
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
      const result = await api.put(`${baseUrl}/v1/space/${spaceId}`, data);
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
      return api.delete(`${baseUrl}/v1/space/${spaceId}`);
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
