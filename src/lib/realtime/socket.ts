import { useEffect } from 'react';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import useAuthStore from '@/stores/useAuthStore';
import { wsUrl } from '@/utils/constants';
import { http } from '@/lib/api/client';
import { enableBrowserNotifications, notifyFromChat, notifyFromServer } from '@/features/notifications/browserNotifications';
import type { AppNotification } from '@/features/notifications/notificationTarget';

/**
 * One Socket.IO connection per signed-in session and workspace.
 * Mount `useRealtimeConnection()` once (in the app layout); read the socket
 * anywhere with `useSocket()`, which re-renders when it connects or changes.
 */

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting';

interface RealtimeState {
  socket: Socket | null;
  status: ConnectionStatus;
}

const useRealtimeStore = create<RealtimeState>(() => ({ socket: null, status: 'idle' }));

export const useSocket = () => useRealtimeStore((s) => s.socket);
export const useRealtimeStatus = () => useRealtimeStore((s) => s.status);

interface NotificationEvent {
  data?: AppNotification;
}

/** Kept for older callers: turns desktop alerts on (asks for permission if needed). */
export function requestNotificationPermission() {
  void enableBrowserNotifications();
}

export function useRealtimeConnection() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?._id);
  const workspaceId = useAuthStore((s) => s.currentWorkspace?._id);

  useEffect(() => {
    if (!token || !userId || !workspaceId) return;

    let socket: Socket | null = null;
    let cancelled = false;
    const set = useRealtimeStore.setState;

    set({ status: 'connecting' });
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      socket = io(wsUrl, {
        auth: { token, userId, workspaceId },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => set({ status: 'connected' }));
      socket.on('disconnect', () => set({ status: 'reconnecting' }));
      socket.on('connect_error', () => set({ status: 'reconnecting' }));
      socket.on('notification', (event: NotificationEvent) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        notifyFromServer(event?.data);
      });
      socket.on('chat:message', (event: { data?: Parameters<typeof notifyFromChat>[0] }) => {
        const message = event?.data;
        if (!message?.conversation_id) return;
        type Conv = NonNullable<Parameters<typeof notifyFromChat>[1]>;
        const cached = queryClient.getQueryData<Conv[]>(['chat', 'conversations']);
        const known = cached?.find((c) => c?._id === message.conversation_id);
        // Outside the chat page the list may not be loaded (or may predate a new DM): fetch it.
        const lookup = known
          ? Promise.resolve(known)
          : queryClient
              .fetchQuery({ queryKey: ['chat', 'conversations'], queryFn: async () => (await http.get<Conv[]>('/v1/chat/conversation')) ?? [], staleTime: 0 })
              .then((list) => list.find((c) => c._id === message.conversation_id))
              .catch(() => undefined);
        void lookup.then((conversation) => notifyFromChat(message, conversation, userId));
      });

      set({ socket });
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
      set({ socket: null, status: 'idle' });
    };
  }, [token, userId, workspaceId, queryClient]);
}
