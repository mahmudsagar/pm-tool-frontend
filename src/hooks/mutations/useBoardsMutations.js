import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
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
      const result = await api.post(`${baseUrl}/v1/page/document`, taskData);
      return result.data;
    },
    
    onSuccess: (data, variables) => {
      // The board query key includes viewState as the 3rd segment, so we use
      // a predicate to match all cached entries for this board regardless of viewState.
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'boards' && query.queryKey[1] === variables.boardId },
        (oldData) => {
          if (!oldData) return oldData;

          const appendDoc = (board) => ({
            ...board,
            documents: [...(board.documents || []), data],
          });

          return Array.isArray(oldData) ? oldData.map(appendDoc) : appendDoc(oldData);
        }
      );

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
 * Mutation hook to update a task's custom_meta values in a board document
 */
export const useUpdateBoardTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, taskId, custom_meta }) => {
      let userId = null;
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          userId = u?._id || u?.id || null;
        }
      } catch (_) { /* ignore */ }

      const result = await api.put(`${baseUrl}/v1/page/document?id=${taskId}`, {
        id: taskId,
        custom_meta,
        last_updated_by: userId,
      });
      return result.data;
    },

    onSuccess: (data, variables) => {
      // Optimistically update the cached board documents
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'boards' && query.queryKey[1] === variables.boardId },
        (oldData) => {
          if (!oldData) return oldData;

          const updateDoc = (board) => ({
            ...board,
            documents: (board.documents || []).map(doc =>
              doc._id === variables.taskId
                ? { ...doc, custom_meta: variables.custom_meta }
                : doc
            ),
          });

          return Array.isArray(oldData) ? oldData.map(updateDoc) : updateDoc(oldData);
        }
      );
    },
  });
};

/**
 * Mutation hook to create a subtask under a parent task in a board
 */
export const useCreateSubtask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ boardId, parentTaskId, taskData }) => {
      const result = await api.post(`${baseUrl}/v1/page/document`, {
        ...taskData,
        parent_id: parentTaskId,
      });
      return result.data;
    },

    onSuccess: (data, variables) => {
      queryClient.setQueriesData(
        { predicate: (query) => query.queryKey[0] === 'boards' && query.queryKey[1] === variables.boardId },
        (oldData) => {
          if (!oldData) return oldData;

          const appendSubtask = (board) => ({
            ...board,
            documents: (board.documents || []).map(doc =>
              doc._id === variables.parentTaskId
                ? { ...doc, subtasks: [...(doc.subtasks || []), data] }
                : doc
            ),
          });

          return Array.isArray(oldData) ? oldData.map(appendSubtask) : appendSubtask(oldData);
        }
      );

      toast({ title: 'Subtask created successfully' });
    },

    onError: (error) => {
      toast({
        title: 'Failed to create subtask',
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
      const result = await api.put(`${baseUrl}/v1/board?id=${boardId}`, data);
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
      return api.delete(`${baseUrl}/v1/board?id=${boardId}`);
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
