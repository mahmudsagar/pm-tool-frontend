import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import useAuthStore from '@/stores/useAuthStore';
import { notificationTarget, type AppNotification } from './notificationTarget';

/* ------------------------------------------------------------ settings */

export type ChatAlerts = 'direct' | 'all' | 'off';

interface BrowserNotificationSettings {
  /** The user turned desktop alerts on for this browser. */
  enabled: boolean;
  /** Which chat messages alert: direct messages only, every message, or none (mentions still alert). */
  chat: ChatAlerts;
  /** Also alert while this tab is visible. */
  whileFocused: boolean;
  set: (patch: Partial<Omit<BrowserNotificationSettings, 'set'>>) => void;
}

/** Per-browser settings: permission is per site and device, so this isn't synced to the account. */
export const useBrowserNotificationSettings = create<BrowserNotificationSettings>()(
  persist(
    (set) => ({
      enabled: false,
      chat: 'direct',
      whileFocused: false,
      set: (patch) => set(patch),
    }),
    { name: 'browser-notifications' },
  ),
);

/* ---------------------------------------------------------- permission */

export type PermissionState = NotificationPermission | 'unsupported';

export function currentPermission(): PermissionState {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Live permission state; updates when the user changes it in the browser's site settings. */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState>(currentPermission);
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const sync = () => setPermission(currentPermission());
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'notifications' as PermissionName })
        .then((s) => {
          status = s;
          s.addEventListener('change', sync);
        })
        .catch(() => undefined);
    }
    window.addEventListener('focus', sync);
    return () => {
      status?.removeEventListener('change', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);
  return [permission, setPermission] as const;
}

/** Asks for permission (only possible from a user gesture) and turns alerts on when granted. */
export async function enableBrowserNotifications(): Promise<PermissionState> {
  if (currentPermission() === 'unsupported') return 'unsupported';
  let result: NotificationPermission = Notification.permission;
  if (result === 'default') result = await Notification.requestPermission();
  useBrowserNotificationSettings.getState().set({ enabled: result === 'granted' });
  return result;
}

export function disableBrowserNotifications() {
  useBrowserNotificationSettings.getState().set({ enabled: false });
}

/* -------------------------------------------------------------- showing */

const NAVIGATE_EVENT = 'app:notification-navigate';
const recent = new Map<string, number>();

function snoozed() {
  const until = (useAuthStore.getState().user as { notification_prefs?: { snooze_until?: string | null } } | null)?.notification_prefs?.snooze_until;
  return !!until && new Date(until).getTime() > Date.now();
}

function prefAllows(kind: 'mentions' | 'assignments' | 'updates') {
  const prefs = (useAuthStore.getState().user as { notification_prefs?: Record<string, unknown> } | null)?.notification_prefs ?? {};
  const value = prefs[kind];
  return value === undefined ? kind !== 'updates' : value !== false;
}

function canShow(force = false) {
  const s = useBrowserNotificationSettings.getState();
  if (!s.enabled || currentPermission() !== 'granted') return false;
  if (!force && !s.whileFocused && document.visibilityState === 'visible' && document.hasFocus()) return false;
  return true;
}

interface ShowOptions {
  title: string;
  body?: string;
  /** Same tag replaces an earlier alert instead of stacking. */
  tag: string;
  /** In-app path to open on click. */
  path?: string | null;
  /** Show even while this tab is focused (confirmations and tests). */
  force?: boolean;
}

export function showBrowserNotification({ title, body, tag, path, force }: ShowOptions) {
  if (!canShow(force)) return false;
  // The same event can arrive twice (socket rooms overlap); show it once.
  const now = Date.now();
  if ((recent.get(tag) ?? 0) > now - 10_000) return false;
  recent.set(tag, now);
  try {
    const n = new Notification(title, { body: body?.slice(0, 180), tag, icon: '/vite.svg', silent: false });
    n.onclick = () => {
      window.focus();
      if (path) window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: path }));
      n.close();
    };
    return true;
  } catch {
    // Some browsers (e.g. Android Chrome) only allow notifications from a service worker.
    return false;
  }
}

/** Alerts for server notifications (mentions, assignments, replies, updates). */
export function notifyFromServer(n: AppNotification | undefined) {
  if (!n || snoozed()) return;
  const kind = n.action === 'mention' || n.action === 'reply' ? 'mentions' : n.action === 'assign' || n.action === 'assignment' ? 'assignments' : 'updates';
  if (!prefAllows(kind)) return;
  const actor = n.metadata?.actor_name || 'Someone';
  showBrowserNotification({
    title: n.message || `${actor} ${n.action ?? 'updated'} ${n.entity_type ?? 'an item'}`,
    tag: `notification-${n._id ?? `${n.entity_id}-${n.action}`}`,
    path: notificationTarget(n),
  });
}

interface ChatMessageLike {
  _id: string;
  conversation_id: string;
  sender_id: string;
  body?: string;
  parent_message_id?: string | null;
  mentions?: string[];
  senderInfo?: { name?: string };
}

interface ConversationLike {
  _id: string;
  type: 'dm' | 'group' | 'channel';
  displayName?: string;
  name?: string;
  muted?: boolean;
}

/**
 * Alerts for chat messages from others. Mentions arrive as server notifications,
 * so here: direct messages (or every message when chat alerts are set to "all").
 */
export function notifyFromChat(message: ChatMessageLike, conversation: ConversationLike | undefined, me: string | undefined) {
  if (!message || message.sender_id === me || snoozed()) return;
  const { chat } = useBrowserNotificationSettings.getState();
  if (chat === 'off' || conversation?.muted) return;
  if (message.mentions?.includes(me ?? '')) return; // Covered by the mention notification.
  const isDirect = conversation?.type === 'dm';
  if (chat === 'direct' && !isDirect) return;
  // Don't alert for the conversation already open in a visible tab.
  const open = new URLSearchParams(window.location.search).get('c');
  if (open === message.conversation_id && document.visibilityState === 'visible' && document.hasFocus()) return;
  const sender = message.senderInfo?.name || 'New message';
  const where = conversation ? (isDirect ? '' : ` in ${conversation.type === 'channel' ? '#' : ''}${conversation.displayName || conversation.name || 'a conversation'}`) : '';
  showBrowserNotification({
    title: `${sender}${where}`,
    body: message.parent_message_id ? `Replied in thread: ${message.body ?? ''}` : message.body || 'Sent an attachment',
    tag: `chat-${message._id}`,
    path: `/chat?c=${message.conversation_id}${message.parent_message_id ? `&thread=${message.parent_message_id}` : ''}&m=${message._id}`,
  });
}

/** Opens the in-app destination when a desktop alert is clicked. Mount once in the app shell. */
export function useNotificationClickNavigation(navigate: (path: string) => void) {
  useEffect(() => {
    const onNavigate = (e: Event) => navigate((e as CustomEvent<string>).detail);
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    return () => window.removeEventListener(NAVIGATE_EVENT, onNavigate);
  }, [navigate]);
}
