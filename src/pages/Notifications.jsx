import { useNotifications } from '@/hooks/useNotifications';
import useAuthStore from '@/stores/useAuthStore';
import { Bell, Check, Trash2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
    const navigate = useNavigate();
    const { user, token, workspace } = useAuthStore();
    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        isConnected,
        isConnecting,
        markAsRead,
        markAllAsRead,
    } = useNotifications(user?._id, workspace?._id, token);

    const getActionIcon = (action) => {
        switch (action) {
            case 'create':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'update':
                return <AlertCircle className="w-5 h-5 text-blue-500" />;
            case 'delete':
                return <Trash2 className="w-5 h-5 text-red-500" />;
            default:
                return <Bell className="w-5 h-5 text-gray-500" />;
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

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification._id);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Notifications</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {unreadCount} unread • {notifications.length} total
                        </p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <Button
                        size="sm"
                        onClick={() => markAllAsRead()}
                        className="gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Loading notifications...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-64 text-red-500">
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                            <p>Failed to load notifications</p>
                        </div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No notifications yet</p>
                            <p className="text-sm mt-1">You're all caught up!</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification) => (
                            <div
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                className={cn(
                                    'p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                                    !notification.is_read && 'bg-blue-50 dark:bg-blue-900/10'
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className="mt-1 flex-shrink-0">
                                        {getActionIcon(notification.action)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                                            {notification.message}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            {notification.metadata?.actor_name} • {formatTime(notification.createdAt)}
                                        </p>
                                    </div>

                                    {/* Unread Indicator */}
                                    {!notification.is_read && (
                                        <div className="flex-shrink-0">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Connection Status */}
            {!isConnected && (
                <div className={`mt-4 p-3 border rounded-lg ${
                    isConnecting 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                }`}>
                    <p className={isConnecting 
                        ? 'text-sm text-blue-800 dark:text-blue-200' 
                        : 'text-sm text-yellow-800 dark:text-yellow-200'
                    }>
                        {isConnecting 
                            ? '🔄 Connecting to real-time notifications...' 
                            : 'WebSocket disconnected - real-time notifications unavailable'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default Notifications;
