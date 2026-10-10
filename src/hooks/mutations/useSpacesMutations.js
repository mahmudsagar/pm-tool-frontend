import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';
import { invalidateSpaceData } from '@/features/spaces/queries';

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
      invalidateSpaceData(queryClient);
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
      const result = await api.put(`${baseUrl}/v1/space`, { ...data, id: spaceId });
      return result.data;
    },
    
    onSuccess: () => {
      invalidateSpaceData(queryClient);
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
      return api.delete(`${baseUrl}/v1/space?id=${encodeURIComponent(spaceId)}`);
    },
    
    onSuccess: () => {
      invalidateSpaceData(queryClient);
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
