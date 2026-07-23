import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from './useRealtimeNotifications';

/**
 * Listen for real-time chat messages on the existing WebSocket connection.
 */
export const useRealtimeChat = (activeConversationId, currentUserId, onMessageDelivered) => {
  const queryClient = useQueryClient();

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
    let attached = false;

    const tryAttach = () => {
      const socket = getSocket();
      if (!socket || attached) return;
      attached = true;
      socket.on('chat:message', handleChatMessage);
    };

    tryAttach();
    const interval = setInterval(tryAttach, 1000);

    return () => {
      clearInterval(interval);
      const socket = getSocket();
      if (socket) socket.off('chat:message', handleChatMessage);
    };
  }, [handleChatMessage]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeConversationId) return;

    socket.emit('conversation:join', activeConversationId);

    return () => {
      socket.emit('conversation:leave', activeConversationId);
    };
  }, [activeConversationId]);
};
