import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtSign, Bell, CheckCheck, CirclePlus, PencilLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDate } from '@/features/files/formatDate';
import { notificationTarget, type AppNotification } from '@/features/notifications/notificationTarget';
import { cn } from '@/lib/utils';

const ACTION_ICONS: Record<string, typeof Bell> = {
  create: CirclePlus,
  update: PencilLine,
  delete: Trash2,
  mention: AtSign,
};

export function NotificationRow({ notification, onOpen }: { notification: AppNotification; onOpen: (n: AppNotification) => void }) {
  const Icon = ACTION_ICONS[notification.action ?? ''] ?? Bell;
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none',
        !notification.is_read && 'bg-brand/5',
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('line-clamp-2 text-xs', notification.is_read ? 'text-muted-foreground' : 'text-foreground')}>
          {notification.message}
        </span>
        <span className="mt-0.5 block text-2xs text-subtle">
          {notification.metadata?.actor_name && `${notification.metadata.actor_name} · `}
          {formatDate(notification.createdAt ?? null)}
        </span>
      </span>
      {!notification.is_read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
    </button>
  );
}

export function NotificationCenter({ workspaceId }: { userId?: string; workspaceId: string; token?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } = useNotifications('', workspaceId) as {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    error: unknown;
    markAsRead: (id: string) => void;
    markAllAsRead: () => Promise<void>;
  };

  const openNotification = (n: AppNotification) => {
    if (!n.is_read) markAsRead(n._id);
    const target = notificationTarget(n);
    if (target) {
      setOpen(false);
      navigate(target);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}>
          <Bell />
          {unreadCount > 0 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-foreground ring-2 ring-background" aria-hidden="true" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h2 className="text-sm font-medium text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={() => void markAllAsRead()}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-7" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="px-3 py-8 text-center text-xs text-danger-foreground">Couldn&apos;t load notifications.</p>
          ) : notifications.length === 0 ? (
            <EmptyState compact icon={Bell} title="You're all caught up" description="New mentions and updates will appear here." />
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 20).map((n) => (
                <NotificationRow key={n._id} notification={n} onOpen={openNotification} />
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t border-border p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              Open inbox
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
