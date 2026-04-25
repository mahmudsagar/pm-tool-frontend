import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Check, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const NotificationCenter = ({ userId, workspaceId, token }) => {
    const [isOpen, setIsOpen] = useState(false);
    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        isConnected,
        markAsRead,
        markAllAsRead,
        requestNotificationPermission
    } = useNotifications(userId, workspaceId, token);

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification._id);
        }
        // Navigate to entity if needed
        // navigateToEntity(notification.entity_type, notification.entity_id);
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'create':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'update':
                return <AlertCircle className="w-4 h-4 text-blue-500" />;
            case 'delete':
                return <Trash2 className="w-4 h-4 text-red-500" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    };

    return (
        <div className="relative">
            {/* Bell Icon with Badge */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="relative"
                title={`${unreadCount} unread notifications`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
                {!isConnected && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-yellow-500 rounded-full" title="WebSocket disconnected" />
                )}
            </Button>

            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-96 max-h-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-lg">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {!isConnected && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-400">Reconnecting...</span>
                            )}
                            {unreadCount > 0 && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => markAllAsRead()}
                                    className="text-xs"
                                >
                                    <Check className="w-3 h-3 mr-1" />
                                    Mark all read
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-80">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-32 text-gray-500">
                                Loading notifications...
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-32 text-red-500 px-4">
                                Failed to load notifications
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-gray-500">
                                <div className="text-center">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No notifications yet</p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            'p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                                            !notification.is_read && 'bg-blue-50 dark:bg-blue-900/20'
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className="mt-1">
                                                {getActionIcon(notification.action)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {notification.metadata?.actor_name} • {formatTime(notification.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread Indicator */}
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-blue-600 dark:text-blue-400"
                            >
                                View all notifications
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
