import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useRealtimeNotifications, requestNotificationPermission } from './useRealtimeNotifications';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { baseUrl } from '@/utils/constants';

/**
 * Hook to manage notifications (both cached and real-time)
 * @param {string} userId - Current user ID
 * @param {string} workspaceId - Current workspace ID
 * @param {string} token - JWT token
 * @returns {Object} Notifications data and methods
 */
export const useNotifications = (userId, workspaceId, token) => {
    const queryClient = useQueryClient();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications
    const {
        data: notificationsData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['notifications', workspaceId],
        queryFn: async () => {
            const result = await api.get(`${baseUrl}/v1/notification?limit=50`);
            return result.data;
        },
        enabled: !!workspaceId,
        refetchInterval: 60000, // Refetch every minute as fallback
        staleTime: 30000 // Cache for 30 seconds
    });

    // Mutation to mark a single notification as read
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId) => {
            return await api.put(`${baseUrl}/v1/notification?notification_id=${notificationId}`);
        },
        onSuccess: (_data, notificationId) => {
            queryClient.setQueryData(['notifications', workspaceId], (oldData) => {
                if (!oldData) return oldData;
                const wasUnread = oldData.notifications?.some(
                    n => n._id === notificationId && !n.is_read
                );
                return {
                    ...oldData,
                    notifications: (oldData.notifications || []).map(n =>
                        n._id === notificationId ? { ...n, is_read: true } : n
                    ),
                    count: {
                        ...oldData.count,
                        unread: wasUnread
                            ? Math.max(0, (oldData.count?.unread || 0) - 1)
                            : (oldData.count?.unread || 0),
                    },
                };
            });
        },
    });

    // Mutation to mark ALL unread notifications as read (server-side)
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            return await api.put(`${baseUrl}/v1/notification?mark_all=true`);
        },
        onSuccess: () => {
            queryClient.setQueryData(['notifications', workspaceId], (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    notifications: (oldData.notifications || []).map(n => ({
                        ...n,
                        is_read: true,
                    })),
                    count: {
                        ...oldData.count,
                        unread: 0,
                    },
                };
            });
            setUnreadCount(0);
            queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] });
        },
    });

    // Setup real-time notifications
    const { isConnected, isConnecting } = useRealtimeNotifications(
        userId,
        workspaceId,
        token,
        (notification) => {
            // Update cache with new notification
            queryClient.setQueryData(['notifications', workspaceId], (oldData) => {
                if (!oldData) {
                    return {
                        notifications: [notification],
                        count: { total: 1, unread: 1 }
                    };
                }
                return {
                    ...oldData,
                    notifications: [notification, ...oldData.notifications],
                    count: {
                        total: oldData.count.total + 1,
                        unread: oldData.count.unread + 1
                    }
                };
            });
        }
    );

    // Update unread count
    useEffect(() => {
        if (notificationsData?.count?.unread !== undefined) {
            setUnreadCount(notificationsData.count.unread);
        }
    }, [notificationsData?.count?.unread]);

    const markAsRead = (notificationId) => {
        markAsReadMutation.mutate(notificationId);
    };

    const markAllAsRead = async () => {
        await markAllAsReadMutation.mutateAsync();
    };

    return {
        notifications: notificationsData?.notifications || [],
        totalCount: notificationsData?.count?.total || 0,
        unreadCount,
        isLoading,
        error,
        isConnected,
        isConnecting,
        refetch,
        markAsRead,
        markAllAsRead,
        requestNotificationPermission
    };
};
