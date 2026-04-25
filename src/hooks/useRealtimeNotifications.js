import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to handle WebSocket connection and real-time notifications
 * @param {string} userId - Current user ID
 * @param {string} workspaceId - Current workspace ID
 * @param {string} token - JWT token
 * @param {Function} onNotification - Callback when notification is received
 * @returns {Object} Socket connection status
 */
export const useRealtimeNotifications = (userId, workspaceId, token, onNotification = null) => {
    const socketRef = useRef(null);
    const queryClient = useQueryClient();
    const reconnectTimeoutRef = useRef(null);
    
    const WS_URL = import.meta.env.BN_WS_URL || 'http://localhost:3002';

    const connectSocket = useCallback(() => {
        if (!userId || !workspaceId || !token) {
            console.warn('Missing required params for WebSocket connection');
            return;
        }

        try {
            // Dynamically import socket.io-client
            import('socket.io-client').then(({ io }) => {
                const socket = io(WS_URL, {
                    auth: {
                        token,
                        userId,
                        workspaceId
                    },
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionAttempts: 10
                });

                // Handle connection
                socket.on('connected', (data) => {
                    console.log('WebSocket connected:', data);
                });

                // Handle real-time notifications
                socket.on('notification', (event) => {
                    console.log('Real-time notification received:', event);
                    
                    const notification = event.data;
                    
                    // Invalidate notifications query to refetch
                    queryClient.invalidateQueries({ queryKey: ['notifications'] });
                    
                    // Call custom callback if provided
                    if (onNotification) {
                        onNotification(notification);
                    }
                    
                    // Show toast/popup notification
                    showNotificationToast(notification);
                });

                // Handle disconnection
                socket.on('disconnect', () => {
                    console.log('WebSocket disconnected');
                });

                // Handle errors
                socket.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                });

                // Keep alive with ping/pong
                const pingInterval = setInterval(() => {
                    if (socket.connected) {
                        socket.emit('ping');
                    }
                }, 30000);

                socket.on('pong', () => {
                    console.log('Pong received');
                });

                socketRef.current = socket;

                // Store in window for global access
                window.__socketIO = socket;
                
                // Clear reconnect timeout
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }

                return () => {
                    clearInterval(pingInterval);
                    socket.disconnect();
                };
            }).catch(err => {
                console.error('Error importing socket.io-client:', err);
                // Attempt to reconnect
                reconnectTimeoutRef.current = setTimeout(connectSocket, 5000);
            });
        } catch (error) {
            console.error('WebSocket connection error:', error);
        }
    }, [userId, workspaceId, token, WS_URL, queryClient, onNotification]);

    useEffect(() => {
        connectSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connectSocket]);

    return {
        isConnected: socketRef.current?.connected || false,
        socket: socketRef.current
    };
};

/**
 * Show a toast notification for new notifications
 * @param {Object} notification - Notification object
 */
function showNotificationToast(notification) {
    // This function can be enhanced to use a toast library like Sonner, React-Toastify, etc.
    // For now, it's a simple implementation
    if (!notification) return;

    const message = notification.message || `New ${notification.entity_type} ${notification.action}`;
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(message, {
            icon: '/logo.png',
            body: `${notification.metadata?.actor_name || 'Someone'} ${notification.action} ${notification.entity_name}`
        });
    }
    
    // Log to console
    console.log('🔔 Notification:', message);
}

/**
 * Request permission for browser notifications
 */
export const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }

    if (Notification.permission === 'granted') {
        return;
    }

    if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
};

/**
 * Get the global socket instance
 * @returns {Socket} Socket.io socket instance
 */
export const getSocket = () => {
    return window.__socketIO;
};
