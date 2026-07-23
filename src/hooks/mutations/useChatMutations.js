import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { chatConversationBaseUrl, chatMessageBaseUrl, mediaBaseUrl } from '@/utils/constants';

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => {
      const result = await api.post(chatConversationBaseUrl, body);
      return result.data ?? result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useCreateSpaceChannel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, name }) => {
      const result = await api.post(chatConversationBaseUrl, {
        type: 'channel',
        space_id: spaceId,
        name,
      });
      return result.data ?? result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });
};

export const useSendMessage = () => {
  return useMutation({
    mutationFn: async (body) => {
      const result = await api.post(chatMessageBaseUrl, body);
      return result.data ?? result;
    },
  });
};

export const useUploadChatMedia = () => {
  return useMutation({
    mutationFn: async (formData) => {
      const result = await api.upload(mediaBaseUrl, formData);
      return result.data ?? result;
    },
  });
};
