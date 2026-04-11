import { useMutation } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { commentBaseUrl, mediaBaseUrl } from '@/utils/constants';

/**
 * Create a new comment on a page
 */
export const useCreateComment = () => {
  return useMutation({
    mutationFn: async (commentBody) => {
      const result = await api.post(commentBaseUrl, commentBody);
      return result.data ?? result;
    },
  });
};

/**
 * Update an existing comment
 */
export const useUpdateComment = () => {
  return useMutation({
    mutationFn: async (commentBody) => {
      const result = await api.put(commentBaseUrl, commentBody);
      return result.data ?? result;
    },
  });
};

/**
 * Delete a comment by ID
 */
export const useDeleteComment = () => {
  return useMutation({
    mutationFn: async (commentId) => {
      return api.delete(`${commentBaseUrl}?id=${commentId}`);
    },
  });
};

/**
 * Upload media attachments (comment attachments, cover photos, etc.)
 * Accepts a FormData object.
 */
export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async (formData) => {
      const result = await api.upload(mediaBaseUrl, formData);
      return result.data ?? result;
    },
  });
};

/**
 * Delete a media item by ID
 */
export const useDeleteMedia = () => {
  return useMutation({
    mutationFn: async ({ mediaId, referenceFor }) => {
      return api.delete(`${mediaBaseUrl}?id=${mediaId}&reference_for=${referenceFor}`);
    },
  });
};
