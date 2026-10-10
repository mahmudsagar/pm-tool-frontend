import { useEffect } from 'react';
import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import useAuthStore from '@/stores/useAuthStore';
import { wsUrl } from '@/utils/constants';

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
  data?: {
    message?: string;
    action?: string;
    entity_type?: string;
    entity_name?: string;
    metadata?: { actor_name?: string };
  };
}

function showBrowserNotification(notification: NotificationEvent['data']) {
  if (!notification || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // The in-app bell already shows it.
  const title = notification.message || `New ${notification.entity_type ?? ''} ${notification.action ?? ''}`.trim();
  new Notification(title, {
    icon: '/logo.png',
    body: `${notification.metadata?.actor_name || 'Someone'} ${notification.action ?? ''} ${notification.entity_name ?? ''}`.trim(),
  });
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission();
  }
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
        showBrowserNotification(event?.data);
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
