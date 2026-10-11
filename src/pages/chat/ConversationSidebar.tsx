import { useMemo, useState } from 'react';
import { BellOff, Hash, MessageSquarePlus, Pin, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/features/chat/api';
import { conversationName, roleTag } from '@/features/chat/format';
import type { Typer } from '@/features/chat/realtime';
import { PresenceAvatar } from './parts';

interface Props {
  conversations: Conversation[];
  loading: boolean;
  activeId: string | null;
  me: string;
  online: Set<string>;
  typers: Record<string, Typer[]>;
  onSelect: (id: string) => void;
  onNewDm: () => void;
  onNewGroup: () => void;
}

function Row({ c, active, me, online, typing, onSelect }: { c: Conversation; active: boolean; me: string; online: Set<string>; typing: number; onSelect: () => void }) {
  const unread = c.unread_count ?? 0;
  const mentions = c.mention_count ?? 0;
  const other = c.type === 'dm' ? c.memberDetails?.find((m) => m._id !== me) : undefined;
  const tag = roleTag(other);
  const name = conversationName(c);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
          active ? 'bg-accent text-foreground' : 'text-muted-foreground',
          unread > 0 && !c.muted && 'font-semibold text-foreground',
        )}
      >
        {c.type === 'dm' ? (
          <PresenceAvatar user={other ?? null} online={other ? online.has(other._id) : undefined} size="xs" />
        ) : c.type === 'group' ? (
          <Users className="size-4 shrink-0" />
        ) : (
          <Hash className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {typing > 0 ? (
          <span className="rounded-full bg-muted px-1.5 text-2xs font-normal text-muted-foreground">{typing} typing</span>
        ) : mentions > 0 ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-semibold text-white" aria-label={`${mentions} mentions`}>
            @{mentions}
          </span>
        ) : unread > 0 && !c.muted ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-semibold text-brand-foreground" aria-label={`${unread} unread`}>
            {unread > 99 ? '99+' : unread}
          </span>
        ) : c.muted ? (
          <BellOff className="size-3 text-subtle" aria-label="Muted" />
        ) : tag ? (
          <span className="text-2xs font-normal text-subtle">{tag}</span>
        ) : null}
      </button>
    </li>
  );
}

export function ConversationSidebar({ conversations, loading, activeId, me, online, typers, onSelect, onNewDm, onNewGroup }: Props) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? conversations.filter((c) => conversationName(c).toLowerCase().includes(s)) : conversations;
  }, [conversations, q]);
  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);
  const sections = [
    { key: 'pinned', label: 'Pinned', icon: Pin, items: pinned },
    { key: 'channels', label: 'Channels', items: rest.filter((c) => c.type === 'channel') },
    { key: 'groups', label: 'Groups', items: rest.filter((c) => c.type === 'group') },
    { key: 'dms', label: 'Direct messages', items: rest.filter((c) => c.type === 'dm') },
  ].filter((s) => s.items.length > 0 || s.key === 'dms');
  const typingCount = (id: string) => new Set((typers[id] ?? []).map((t) => t.user_id)).size;

  return (
    <nav aria-label="Conversations" className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to channel or DM…" aria-label="Jump to channel or DM" className="h-8 pl-7 text-xs" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="New conversation">
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={onNewDm}>
              <MessageSquarePlus /> New direct message
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewGroup}>
              <Users /> New group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
        {loading &&
          Array.from({ length: 8 }, (_, i) => <div key={i} className="mx-2 h-7 animate-pulse rounded-md bg-muted/60" />)}
        {!loading &&
          sections.map((s) => (
            <section key={s.key} aria-label={s.label}>
              <h2 className="mb-1 flex items-center justify-between px-2 text-2xs font-semibold uppercase tracking-wide text-subtle">
                {s.label}
                {s.icon ? <s.icon className="size-3" /> : <span className="font-mono font-normal">{s.items.length || ''}</span>}
              </h2>
              <ul className="space-y-0.5">
                {s.items.map((c) => (
                  <Row key={c._id} c={c} active={c._id === activeId} me={me} online={online} typing={c._id === activeId ? 0 : typingCount(c._id)} onSelect={() => onSelect(c._id)} />
                ))}
                {s.items.length === 0 && s.key === 'dms' && (
                  <li>
                    <button type="button" onClick={onNewDm} className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent">
                      + Start a conversation
                    </button>
                  </li>
                )}
              </ul>
            </section>
          ))}
        {!loading && q && filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No conversations match “{q}”.</p>}
      </div>
    </nav>
  );
}
