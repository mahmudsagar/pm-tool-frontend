import { useEffect, useRef } from 'react';
import { Link2, MessagesSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Conversation, MemberDetail } from '@/features/chat/api';
import { useThread } from '@/features/chat/api';
import { conversationName } from '@/features/chat/format';
import type { Typer } from '@/features/chat/realtime';
import { ChatComposer } from './ChatComposer';
import { MessageItem, type MessageActions } from './MessageItem';
import { TypingLine } from './MessageFeed';
import { EntityCard } from './parts';

interface Props {
  rootId: string;
  conversation: Conversation;
  members: MemberDetail[];
  actions: MessageActions;
  typers: Typer[];
  onClose: () => void;
}

export function ThreadPanel({ rootId, conversation, members, actions, typers, onClose }: Props) {
  const { data, isPending, error } = useThread(rootId);
  const scroller = useRef<HTMLDivElement>(null);
  const count = data?.replies.length ?? 0;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const root = data?.root;
  const title = root?.body ? root.body.slice(0, 60) + (root.body.length > 60 ? '…' : '') : 'Thread';
  const context = root?.entity_refs ?? [];

  return (
    <aside aria-label="Thread" className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex items-start gap-2 border-b border-border px-4 py-3">
        <MessagesSquare className="mt-0.5 size-4 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">Thread: {title}</h2>
          <p className="truncate text-2xs text-muted-foreground">
            {conversation.type === 'channel' ? '#' : ''}
            {conversationName(conversation)}
            {context[0] ? ` › ${context[0].title}` : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close thread" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {isPending && <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading thread…</p>}
        {error && <p className="px-3 py-6 text-center text-xs text-danger-foreground">This thread could not be loaded.</p>}
        {root && (
          <>
            <div className="rounded-xl border border-border bg-muted/30 pb-1">
              <MessageItem message={root} inThread actions={actions} />
            </div>
            <div className="my-3 flex items-center gap-2 px-3 text-2xs text-subtle">
              <span>
                {count} {count === 1 ? 'reply' : 'replies'}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            {data!.replies.map((r, i) => {
              const prev = data!.replies[i - 1];
              const continuation = !!prev && prev.sender_id === r.sender_id && new Date(r.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
              return <MessageItem key={r.clientId ?? r._id} message={r} inThread continuation={continuation} actions={actions} />;
            })}
            <TypingLine typers={typers} className="px-3" />
            {context.length > 0 && (
              <section className="mt-4 px-3" aria-label="Linked context">
                <h3 className="mb-2 flex items-center justify-between text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Context linked <Link2 className="size-3.5" />
                </h3>
                <div className="space-y-2">
                  {context.map((ref) => (
                    <EntityCard key={ref.id} entity={ref} members={actions.members} compact />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border p-3">
        <ChatComposer
          conversationId={conversation._id}
          spaceId={conversation.type === 'channel' ? conversation.space_id : null}
          members={members}
          parentId={rootId}
          placeholder="Reply to thread…"
          submitLabel="Reply"
          toolbar="toggle"
          ariaLabel="Reply to thread"
        />
      </div>
    </aside>
  );
}
