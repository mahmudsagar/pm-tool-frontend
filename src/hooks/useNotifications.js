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

    // Mutation to mark notification as read
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId) => {
            return await api.put(`${baseUrl}/v1/notification?notification_id=${notificationId}`);
        },
        onSuccess: (data, notificationId) => {
            // Update cache
            queryClient.setQueryData(['notifications', workspaceId], (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    notifications: oldData.notifications.map(n =>
                        n._id === notificationId ? { ...n, is_read: true } : n
                    ),
                    count: {
                        ...oldData.count,
                        unread: Math.max(0, oldData.count.unread - 1)
                    }
                };
            });
            // Also invalidate to sync with server
            queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] });
        }
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
        if (!notificationsData?.notifications) return;
        
        const unreadNotifications = notificationsData.notifications.filter(n => !n.is_read);
        await Promise.all(
            unreadNotifications.map(n => markAsReadMutation.mutateAsync(n._id))
        );
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
