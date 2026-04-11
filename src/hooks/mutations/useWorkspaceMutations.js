import { useMutation, useQueryClient } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';
import useAuthStore from '@/stores/useAuthStore';
import { api } from '@/utils/api';

/**
 * Mutation hook to add an existing user to the current workspace.
 * POST /v1/workspace/member — requires Bearer token of the workspace owner.
 *
 * Provide { email } or { user_id } or both (email takes priority).
 */
export const useAddWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, user_id }) => {
      const { currentWorkspace } = useAuthStore.getState();

      const payload = { workspace_id: currentWorkspace._id };
      if (email) payload.email = email;
      if (user_id) payload.user_id = user_id;

      const result = await api.post(`${baseUrl}/v1/workspace/member`, payload);

      if (result?.message) {
        const msg =
          result.message?.[0]?.error?.[0] ||
          result.message ||
          'Failed to add member';
        throw new Error(msg);
      }

      return result;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast({ title: 'Member added to workspace successfully' });
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
