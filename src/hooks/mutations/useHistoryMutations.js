import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { historyBaseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

/**
 * Mutation hook to rollback page content to a specific version.
 */
export const useRollbackVersion = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pageId, historyId }) => {
      const result = await api.post(historyBaseUrl, {
        page_id: pageId,
        history_id: historyId,
      });
      return result;
    },
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', pageId] });
      queryClient.invalidateQueries({ queryKey: ['history', pageId] });
      toast({ title: 'Version restored', description: 'Content has been rolled back successfully.' });
    },
    onError: (error) => {
      toast({
        title: 'Rollback failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
