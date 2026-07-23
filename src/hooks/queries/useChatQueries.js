import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { chatConversationBaseUrl, chatMessageBaseUrl } from '@/utils/constants';

export const useConversations = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.space_id) params.set('space_id', filters.space_id);
  const queryString = params.toString();

  return useQuery({
    queryKey: ['chat', 'conversations', filters],
    queryFn: async () => {
      const url = queryString
        ? `${chatConversationBaseUrl}?${queryString}`
        : chatConversationBaseUrl;
      const result = await api.get(url);
      return result.data ?? [];
    },
    staleTime: 30 * 1000,
  });
};

export const useConversation = (conversationId) => {
  return useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: async () => {
      const result = await api.get(`${chatConversationBaseUrl}?id=${conversationId}`);
      return result.data;
    },
    enabled: !!conversationId,
  });
};

export const useMessages = (conversationId) => {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: async () => {
      const result = await api.get(`${chatMessageBaseUrl}?conversation_id=${conversationId}`);
      return result.data ?? [];
    },
    enabled: !!conversationId,
    staleTime: 10 * 1000,
  });
};
