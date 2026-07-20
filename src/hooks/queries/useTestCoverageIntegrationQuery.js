import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';
import qs from 'qs';

export function useTestCoverageIntegration(boardId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['test-coverage-integration', boardId],
    queryFn: async () => {
      const queryString = qs.stringify({ board_id: boardId }, { encode: false });
      const result = await api.get(`${baseUrl}/v1/test-coverage/integration?${queryString}`);
      return result.data || {
        enabled: false,
        webhook_url: `${baseUrl}/v1/webhook/test-coverage`,
        token_preview: '',
        enabled_at: null,
        last_received_at: null,
      };
    },
    enabled: Boolean(boardId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useTestCoverageIntegrationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ boardId, action = 'enable' }) => {
      const result = await api.post(`${baseUrl}/v1/test-coverage/integration`, {
        board_id: boardId,
        action,
      });
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['test-coverage-integration', variables.boardId], data);
      if (variables.action === 'disable') {
        toast({ title: 'CI integration disconnected' });
      } else {
        toast({ title: variables.action === 'rotate' ? 'New token generated' : 'CI integration connected' });
      }
    },
    onError: (error) => {
      toast({
        title: 'Could not update coverage integration',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
