import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userData) => {
      const result = await api.post(`${baseUrl}/v1/user`, userData);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create user', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, data }) => {
      const result = await api.put(`${baseUrl}/v1/user/${userId}`, data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update user', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId) => {
      return api.delete(`${baseUrl}/v1/user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast({ title: 'User deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete user', description: error.message, variant: 'destructive' });
    },
  });
};
