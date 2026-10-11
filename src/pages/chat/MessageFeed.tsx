import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Message } from '@/features/chat/api';
import { buildRows } from '@/features/chat/format';
import type { Typer } from '@/features/chat/realtime';
import { MessageItem, type MessageActions } from './MessageItem';

export function TypingLine({ typers, className }: { typers: Typer[]; className?: string }) {
  if (!typers.length) return <div className={cn('h-5', className)} aria-hidden />;
  const names = typers.map((t) => t.name.split(' ')[0]);
  const text = names.length === 1 ? `${names[0]} is typing…` : names.length === 2 ? `${names[0]} and ${names[1]} are typing…` : `${names.length} people are typing…`;
  return (
    <div className={cn('flex h-5 items-center gap-2 text-2xs text-muted-foreground', className)} aria-live="polite">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </span>
      {text}
    </div>
  );
}

interface FeedProps {
  conversationKey: string;
  messages: Message[];
  loading: boolean;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  actions: MessageActions;
  /** Unread count when the conversation was opened, for the "New" divider. */
  unreadAtOpen: number;
  empty: React.ReactNode;
  highlightId?: string | null;
}

/** Scrollable message list: keeps the view pinned to the bottom, loads older pages at the top. */
export function MessageFeed({ conversationKey, messages, loading, hasOlder, loadingOlder, onLoadOlder, actions, unreadAtOpen, empty, highlightId }: FeedProps) {
  const ref = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const prevHeight = useRef(0);
  const prevFirst = useRef<string | undefined>();
  const [showJump, setShowJump] = useState(false);

  const newFrom = useMemo(() => {
    if (!unreadAtOpen) return -1;
    let count = 0;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender_id !== actions.me) count += 1;
      if (count === unreadAtOpen) return i;
    }
    return -1;
    // Only recompute when switching conversations or the count is first known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey, unreadAtOpen, messages.length > 0]);
  const rows = useMemo(() => buildRows(messages, newFrom), [messages, newFrom]);

  // New conversation: start at the bottom (or the highlighted message).
  useLayoutEffect(() => {
    atBottom.current = true;
    prevFirst.current = undefined;
  }, [conversationKey]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = messages[0]?._id;
    if (prevFirst.current && first !== prevFirst.current && prevHeight.current) {
      // Older messages were prepended: keep the same message under the viewport.
      el.scrollTop += el.scrollHeight - prevHeight.current;
    } else if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevFirst.current = first;
    prevHeight.current = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!highlightId) return;
    const node = document.getElementById(`msg-${highlightId}`);
    if (node) {
      node.scrollIntoView({ block: 'center' });
      node.classList.add('ring-2', 'ring-brand/50');
      const t = setTimeout(() => node.classList.remove('ring-2', 'ring-brand/50'), 2000);
      return () => clearTimeout(t);
    }
  }, [highlightId, messages.length]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = distance < 80;
    setShowJump(distance > 600);
    if (el.scrollTop < 120 && hasOlder && !loadingOlder) {
      prevHeight.current = el.scrollHeight;
      onLoadOlder();
    }
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="h-full overflow-y-auto px-2 pb-2 pt-4 sm:px-4" role="log" aria-label="Messages" aria-busy={loading}>
        {hasOlder && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="xs" disabled={loadingOlder} onClick={onLoadOlder}>
              {loadingOlder ? <Loader2 className="animate-spin" /> : null} Load earlier messages
            </Button>
          </div>
        )}
        {loading && (
          <div className="space-y-4 px-3 py-6" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <div className="size-9 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && messages.length === 0 && empty}
        {rows.map((row) =>
          row.kind === 'day' ? (
            <div key={row.key} className="my-3 flex items-center gap-3" role="separator" aria-label={row.label}>
              <span className="h-px flex-1 bg-border" />
              <span className="rounded-full border border-border bg-card px-3 py-0.5 text-2xs font-medium text-muted-foreground">{row.label}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : row.kind === 'new' ? (
            <div key={row.key} className="my-2 flex items-center gap-2" role="separator" aria-label="New messages">
              <span className="h-px flex-1 bg-danger/50" />
              <span className="text-2xs font-semibold uppercase tracking-wide text-danger-foreground">New</span>
            </div>
          ) : (
            <MessageItem key={row.key} message={row.message} continuation={row.continuation} actions={actions} />
          ),
        )}
      </div>
      {showJump && (
        <Button
          size="xs"
          variant="outline"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-overlay"
          onClick={() => {
            const el = ref.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          }}
        >
          <ArrowDown /> Jump to latest
        </Button>
      )}
    </div>
  );
}
