import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { NotificationRow } from '@/components/NotificationCenter';
import { notificationTarget, type AppNotification } from '@/features/notifications/notificationTarget';
import { useNotifications } from '@/hooks/useNotifications';
import { requestNotificationPermission } from '@/lib/realtime/socket';
import useAuthStore from '@/stores/useAuthStore';

type Filter = 'all' | 'unread' | 'mentions';

/** Groups by calendar day: Today, Yesterday, then dates. */
function dayLabel(iso?: string) {
  if (!iso) return 'Earlier';
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function InboxPage() {
  const navigate = useNavigate();
  const workspaceId = useAuthStore((s) => s.currentWorkspace?._id ?? '');
  const [filter, setFilter] = useState<Filter>('all');
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead, markAllAsRead } = useNotifications('', workspaceId) as {
    notifications: AppNotification[];
    unreadCount: number;
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => Promise<void>;
  };
  const browserNotificationsOff = typeof Notification !== 'undefined' && Notification.permission === 'default';

  const groups = useMemo(() => {
    const list = notifications.filter((n) => (filter === 'unread' ? !n.is_read : filter === 'mentions' ? n.action === 'mention' : true));
    const map = new Map<string, AppNotification[]>();
    for (const n of list) {
      const key = dayLabel(n.createdAt);
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return Array.from(map.entries());
  }, [notifications, filter]);

  const open = (n: AppNotification) => {
    if (!n.is_read) markAsRead(n._id);
    const target = notificationTarget(n);
    if (target) navigate(target);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Inbox</h1>
            <p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            aria-label="Filter notifications"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'mentions', label: 'Mentions' },
            ]}
          />
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAllAsRead()}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
      </header>

      {browserNotificationsOff && (
        <div className="flex flex-col gap-2 rounded-xl border border-info/20 bg-info/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">Get desktop alerts for mentions and updates while this tab is in the background.</span>
          <Button variant="outline" size="xs" onClick={requestNotificationPermission}>
            Enable desktop notifications
          </Button>
        </div>
      )}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Inbox}
            title={filter === 'all' ? 'No notifications yet' : 'Nothing here'}
            description={filter === 'all' ? 'Mentions, assignments and updates to your work show up here.' : 'Try another filter.'}
          />
        </div>
      ) : (
        groups.map(([label, items]) => (
          <section key={label} className="space-y-2">
            <h2 className="px-1 text-2xs font-medium uppercase tracking-wider text-subtle">{label}</h2>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {items.map((n) => (
                <NotificationRow key={n._id} notification={n} onOpen={open} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
