import { useMutation, useQueryClient } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';
import useAuthStore from '@/stores/useAuthStore';

/**
 * Mutation hook to add an existing user to the current workspace.
 * POST /v1/workspace/member — requires Bearer token of the workspace owner.
 *
 * Provide { email } or { user_id } or both (email takes priority).
 */
export const useAddWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentWorkspace } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, user_id }) => {
      const token = localStorage.getItem('token');

      const payload = { workspace_id: currentWorkspace._id };
      if (email) payload.email = email;
      if (user_id) payload.user_id = user_id;

      const response = await fetch(`${baseUrl}/v1/workspace/member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg =
          err?.message?.[0]?.error?.[0] ||
          err?.message ||
          'Failed to add member';
        throw new Error(msg);
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
