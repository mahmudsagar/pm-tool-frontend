import type { MemberDetail, Message } from './api';

export function roleTag(m?: MemberDetail | null) {
  if (!m) return null;
  if (m.title) return m.title;
  if (m.role === 'owner') return 'Owner';
  if (m.role === 'admin') return 'Admin';
  if (m.role === 'guest') return 'Guest';
  return null;
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const date = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) });
  if (same(d, today)) return `Today, ${date}`;
  if (same(d, yest)) return `Yesterday, ${date}`;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function ago(iso?: string | null) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const GROUP_MS = 5 * 60 * 1000;

export type FeedRow = { kind: 'day'; key: string; label: string } | { kind: 'new'; key: string } | { kind: 'msg'; key: string; message: Message; continuation: boolean };

/** Day dividers, a "new messages" marker and author grouping for a feed. */
export function buildRows(messages: Message[], newFromIndex = -1): FeedRow[] {
  const rows: FeedRow[] = [];
  let prev: Message | undefined;
  messages.forEach((m, i) => {
    const day = new Date(m.createdAt).toDateString();
    const newDay = !prev || new Date(prev.createdAt).toDateString() !== day;
    if (newDay) rows.push({ kind: 'day', key: `day-${day}`, label: dayLabel(m.createdAt) });
    if (i === newFromIndex) rows.push({ kind: 'new', key: 'new' });
    const continuation =
      !!prev && !newDay && i !== newFromIndex && prev.sender_id === m.sender_id && !prev.deleted_at && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS && (prev.reply_count ?? 0) === 0;
    rows.push({ kind: 'msg', key: m.clientId ?? m._id, message: m, continuation });
    prev = m;
  });
  return rows;
}

export function conversationName(c: { type: string; displayName?: string; name?: string }) {
  return c.displayName || c.name || (c.type === 'dm' ? 'Direct message' : 'Conversation');
}
