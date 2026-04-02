import { useMutation, useQueryClient } from '@tanstack/react-query';
import { baseUrl, documentBaseUrl } from '@/utils/constants';
import { useToast } from '@/components/ui/use-toast';

/**
 * Mutation hook to create a new file/document
 */
export const useCreateFile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(documentBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(fileData),
      });
      
      if (!response.ok) throw new Error('Failed to create file');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update file');
      const result = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${baseUrl}/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete file');
      return response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(documentBaseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: documentId, content }),
      });
      
      if (!response.ok) throw new Error('Failed to update document');
      return response.json();
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
 * Mutation hook to delete a document
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${documentBaseUrl}?id=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
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

