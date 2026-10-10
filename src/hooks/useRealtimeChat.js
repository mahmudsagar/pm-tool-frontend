import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/lib/realtime/socket';

/**
 * Listen for real-time chat messages on the existing WebSocket connection.
 */
export const useRealtimeChat = (activeConversationId, currentUserId, onMessageDelivered) => {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const handleChatMessage = useCallback((event) => {
    const message = event?.data;
    if (!message?.conversation_id) return;

    const isOwn = message.sender_id === currentUserId;
    const status = isOwn ? 'delivered' : undefined;

    queryClient.setQueryData(['chat', 'messages', message.conversation_id], (old) => {
      const existing = old ?? [];
      const idx = existing.findIndex(m => m._id === message._id);
      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = { ...updated[idx], ...message, status: status || updated[idx].status };
        return updated;
      }
      return [...existing, { ...message, status }];
    });

    if (isOwn) {
      onMessageDelivered?.(message._id);
    }

    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
  }, [queryClient, currentUserId, onMessageDelivered]);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat:message', handleChatMessage);
    return () => {
      socket.off('chat:message', handleChatMessage);
    };
  }, [socket, handleChatMessage]);

  useEffect(() => {
    if (!socket || !activeConversationId) return;
    socket.emit('conversation:join', activeConversationId);
    return () => {
      socket.emit('conversation:leave', activeConversationId);
    };
  }, [socket, activeConversationId]);
};
