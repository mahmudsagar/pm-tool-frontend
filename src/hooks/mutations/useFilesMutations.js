import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { baseUrl, documentBaseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

const invalidateFileQueries = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['files'] });
  queryClient.invalidateQueries({ queryKey: ['spaces'] });
  queryClient.invalidateQueries({ queryKey: ['documents'] });
  queryClient.invalidateQueries({ queryKey: ['folders'] });
  queryClient.invalidateQueries({ queryKey: ['groups'] });
};

/**
 * Create a document/page/sheet/whiteboard via /v1/page/document
 */
export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data) => {
      const result = await api.post(documentBaseUrl, data);
      return result;
    },
    onSuccess: () => {
      invalidateFileQueries(queryClient);
    },
    onError: (error) => {
      toast({ title: 'Failed to create document', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Update a document/board/folder/group title or name.
 * Pass entity: 'page' | 'board' | 'folder' | 'group'
 */
export const useUpdateEntityTitle = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ entity, id, title }) => {
      const endpointMap = {
        page: `${documentBaseUrl}`,
        board: `${baseUrl}/v1/board`,
        folder: `${baseUrl}/v1/folder?id=${id}`,
        group: `${baseUrl}/v1/group?id=${id}`,
      };
      const bodyMap = {
        page: { id, title },
        board: { id, name: title },
        folder: { name: title },
        group: { name: title },
      };
      const result = await api.put(endpointMap[entity], bodyMap[entity]);
      return result;
    },
    onSuccess: () => {
      invalidateFileQueries(queryClient);
    },
    onError: (error) => {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Create a board via /v1/board
 */
export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data) => {
      const result = await api.post(`${baseUrl}/v1/board`, data);
      return result;
    },
    onSuccess: () => {
      invalidateFileQueries(queryClient);
    },
    onError: (error) => {
      toast({ title: 'Failed to create board', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Create a folder via /v1/folder
 */
export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data) => {
      const result = await api.post(`${baseUrl}/v1/folder`, data);
      return result;
    },
    onSuccess: () => {
      invalidateFileQueries(queryClient);
    },
    onError: (error) => {
      toast({ title: 'Failed to create folder', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Create a group via /v1/group
 */
export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data) => {
      const result = await api.post(`${baseUrl}/v1/group`, data);
      return result;
    },
    onSuccess: () => {
      invalidateFileQueries(queryClient);
    },
    onError: (error) => {
      toast({ title: 'Failed to create group', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Mutation hook to create a new file/document
 */
export const useCreateFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileData) => {
      const result = await api.post(documentBaseUrl, fileData);
      return result.data;
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'File created successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to create file',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to update an existing file
 */
export const useUpdateFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ fileId, data }) => {
      const result = await api.put(`${baseUrl}/v1/files/${fileId}`, data);
      return result.data;
    },
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      toast({ title: 'File updated successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to update file',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Mutation hook to delete a file with optimistic updates
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileId) => {
      return api.delete(`${baseUrl}/v1/files/${fileId}`);
    },
    
    onMutate: async (fileId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['files'] });
      
      // Snapshot the previous value
      const previousFiles = queryClient.getQueryData(['files']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['files'], (old) => 
        old?.filter(file => file._id !== fileId)
      );
      
      // Return context with the snapshot
      return { previousFiles };
    },
    
    onError: (err, _, context) => {
      // Rollback on error
      queryClient.setQueryData(['files'], context.previousFiles);
      toast({
        title: 'Failed to delete file',
        description: err.message,
        variant: 'destructive',
      });
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'File deleted successfully' });
    },
  });
};

/**
 * Mutation hook to update document content
 */
export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, content }) => {
      const result = await api.put(documentBaseUrl, { id: documentId, content });
      return result;
    },

    // Optimistically update the cache before the API responds so the UI
    // reflects changes immediately without a round-trip.
    onMutate: async ({ documentId, content }) => {
      // Cancel any in-flight fetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey: ['documents', documentId] });

      const previousData = queryClient.getQueryData(['documents', documentId]);

      // Update pageContent.content — the path all page components read from
      // (pageContent?.content?.content) so the shape must be:
      //   pageContent: { ...existing, content: <what the editor sent> }
      queryClient.setQueryData(['documents', documentId], (old) =>
        old
          ? { ...old, pageContent: { ...old.pageContent, content } }
          : old
      );

      return { previousData };
    },

    // Roll back the optimistic update if the API call fails.
    onError: (_err, { documentId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['documents', documentId], context.previousData);
      }
    },

    // Confirm the cache with the final state. Avoids an infinite
    // GET → re-init → auto-save → PUT loop in spreadsheets.
    onSuccess: (_, { documentId, content }) => {
      queryClient.setQueryData(['documents', documentId], (old) =>
        old
          ? { ...old, pageContent: { ...old.pageContent, content } }
          : old
      );
    },
  });
};

/**
 * Mutation hook to update document custom_meta (e.g. kanban field values)
 * Pass { documentId, custom_meta }
 */
export const useUpdateDocumentMeta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, custom_meta }) => {
      const result = await api.put(documentBaseUrl, { id: documentId, custom_meta });
      return result;
    },
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
    },
  });
};

/**
 * Mutation hook to delete a document
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId) => {
      return api.delete(`${documentBaseUrl}?id=${documentId}`);
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Document deleted successfully' });
    },
    
    onError: (error) => {
      toast({
        title: 'Failed to delete document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

