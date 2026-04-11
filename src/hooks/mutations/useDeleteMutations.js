import { useMutation, useQueryClient } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/utils/api';

/**
 * Universal delete mutation hook for all entity types
 * Handles: page, folder, group, space, board
 */
export const useDeleteEntity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ entityId, entityType }) => {
      // Determine the correct endpoint based on entity type
      let endpoint;
      switch (entityType) {
        case 'page':
          endpoint = `${baseUrl}/v1/page/document?id=${entityId}`;
          break;
        case 'folder':
          endpoint = `${baseUrl}/v1/folder?id=${entityId}`;
          break;
        case 'group':
          endpoint = `${baseUrl}/v1/group?id=${entityId}`;
          break;
        case 'space':
          endpoint = `${baseUrl}/v1/space?id=${entityId}`;
          break;
        case 'board':
          endpoint = `${baseUrl}/v1/board?id=${entityId}`;
          break;
        default:
          throw new Error(`Invalid entity type: ${entityType}`);
      }

      const result = await api.delete(endpoint);
      
      // Check if API returned an error in the response body
      if (result?.error) {
        throw new Error(result.error);
      }
      
      return result;
    },
    
    onMutate: async () => {
      // Cancel outgoing refetches for relevant queries
      await queryClient.cancelQueries({ queryKey: ['spaces'] });
      await queryClient.cancelQueries({ queryKey: ['files'] });
      await queryClient.cancelQueries({ queryKey: ['folders'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });
      await queryClient.cancelQueries({ queryKey: ['documents'] });
      
      // Snapshot previous values for rollback
      const previousData = {
        spaces: queryClient.getQueryData(['spaces']),
        files: queryClient.getQueryData(['files']),
        folders: queryClient.getQueryData(['folders']),
        groups: queryClient.getQueryData(['groups']),
      };
      
      return { previousData };
    },
    
    onError: (error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousData) {
        queryClient.setQueryData(['spaces'], context.previousData.spaces);
        queryClient.setQueryData(['files'], context.previousData.files);
        queryClient.setQueryData(['folders'], context.previousData.folders);
        queryClient.setQueryData(['groups'], context.previousData.groups);
      }
      
      toast({
        title: `Failed to delete ${variables.entityType}`,
        description: error.message,
        variant: 'destructive',
      });
    },
    
    onSuccess: (data, variables) => {
      // Invalidate all queries starting with these keys (includes parameterized queries)
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'spaces' ||
          query.queryKey[0] === 'files' ||
          query.queryKey[0] === 'folders' ||
          query.queryKey[0] === 'groups' ||
          query.queryKey[0] === 'documents'
      });
      
      toast({
        title: `${variables.entityType.charAt(0).toUpperCase() + variables.entityType.slice(1)} deleted successfully`,
      });
    },
  });
};
