import { BellRing, MonitorSmartphone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  disableBrowserNotifications,
  enableBrowserNotifications,
  showBrowserNotification,
  useBrowserNotificationSettings,
  useNotificationPermission,
  type ChatAlerts,
} from './browserNotifications';

/** Desktop (browser) notification controls for this device. */
export function BrowserNotificationsCard({ className }: { className?: string }) {
  const { toast } = useToast();
  const [permission, setPermission] = useNotificationPermission();
  const { enabled, chat, whileFocused, set } = useBrowserNotificationSettings();
  const on = enabled && permission === 'granted';

  const toggle = async (next: boolean) => {
    if (!next) return disableBrowserNotifications();
    const result = await enableBrowserNotifications();
    setPermission(result);
    if (result === 'granted') {
      showBrowserNotification({ title: 'Desktop notifications are on', body: 'You’ll get alerts here for mentions, assignments and direct messages.', tag: 'enabled', path: null, force: true });
      toast({ title: 'Desktop notifications turned on' });
    } else if (result === 'denied') {
      toast({ variant: 'destructive', title: 'Notifications are blocked', description: 'Allow them for this site in your browser’s site settings, then try again.' });
    }
  };

  const test = () => {
    const shown = showBrowserNotification({ title: 'Test notification', body: 'This is how alerts will look on this device.', tag: `test-${Date.now()}`, path: '/notifications', force: true });
    if (!shown) toast({ variant: 'destructive', title: 'Could not show a notification', description: 'Your browser or OS may be blocking them (check Focus / Do Not Disturb).' });
  };

  return (
    <div className={cn('space-y-3 rounded-lg border border-border bg-background/40 p-3', className)}>
      <label className={cn('flex items-center gap-3', permission === 'unsupported' || permission === 'denied' ? 'opacity-70' : 'cursor-pointer')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <MonitorSmartphone className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-foreground">Desktop notifications</span>
          <span className="block text-2xs text-muted-foreground">
            {permission === 'unsupported'
              ? 'This browser doesn’t support desktop notifications.'
              : permission === 'denied'
                ? 'Blocked by your browser for this site.'
                : on
                  ? 'On for this browser. Alerts show when the tab is in the background.'
                  : 'Get alerts on this device for mentions, assignments and direct messages.'}
          </span>
        </span>
        <Switch checked={on} disabled={permission === 'unsupported' || permission === 'denied'} onCheckedChange={(v) => void toggle(v)} aria-label="Desktop notifications" />
      </label>

      {permission === 'denied' && (
        <p className="flex items-start gap-2 rounded-md bg-warning/10 px-2.5 py-2 text-2xs text-warning-foreground">
          <ShieldAlert className="mt-px size-3.5 shrink-0" />
          To turn them on, click the lock or settings icon next to the address bar, set Notifications to “Allow”, then reload this page.
        </p>
      )}

      {on && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="block text-xs font-medium text-foreground">Chat messages</span>
              <span className="block text-2xs text-muted-foreground">Mentions always alert. Muted conversations never do.</span>
            </span>
            <SegmentedControl
              size="sm"
              aria-label="Chat message alerts"
              value={chat}
              onValueChange={(v: ChatAlerts) => set({ chat: v })}
              options={[
                { value: 'direct', label: 'Direct messages' },
                { value: 'all', label: 'All messages' },
                { value: 'off', label: 'Off' },
              ]}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-xs font-medium text-foreground">Alert while this tab is open</span>
              <span className="block text-2xs text-muted-foreground">Off: only when you’re in another tab or app.</span>
            </span>
            <Switch checked={whileFocused} onCheckedChange={(v) => set({ whileFocused: v })} aria-label="Alert while this tab is open" />
          </label>
          <Button variant="outline" size="xs" onClick={test}>
            <BellRing /> Send a test notification
          </Button>
        </div>
      )}
    </div>
  );
}
