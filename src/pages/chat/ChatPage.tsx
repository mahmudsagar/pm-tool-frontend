import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hash, MessageSquarePlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useDialog from '@/hooks/useDialog';
import useAuthStore from '@/stores/useAuthStore';
import StartDMDialogJs from '@/components/chat/StartDMDialog';
import CreateGroupDialogJs from '@/components/chat/CreateGroupDialog';
import { cn } from '@/lib/utils';
import { flattenFeed, useConversations, useFeed, useMarkRead, useMessageActions, type MemberDetail, type Message } from '@/features/chat/api';
import { conversationName } from '@/features/chat/format';
import { useChatRealtime } from '@/features/chat/realtime';
import { ConversationSidebar } from './ConversationSidebar';
import { BookmarksBar, ChannelHeader } from './ChannelHeader';
import { ChatComposer } from './ChatComposer';
import { MessageFeed, TypingLine } from './MessageFeed';
import { ThreadPanel } from './ThreadPanel';
import type { MessageActions } from './MessageItem';
import './chat.css';

type DialogProps = { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void };
const StartDMDialog = StartDMDialogJs as unknown as React.ComponentType<DialogProps>;
const CreateGroupDialog = CreateGroupDialogJs as unknown as React.ComponentType<DialogProps>;

export default function ChatPage() {
  const me = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.currentWorkspace?.role);
  const isAdmin = role === 'owner' || (role as string | undefined) === 'admin';
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');
  const threadId = params.get('thread');
  const highlight = params.get('m');
  const [dmOpen, setDmOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };

  const { data: conversations = [], isPending: convLoading } = useConversations();
  const active = conversations.find((c) => c._id === activeId) ?? null;
  const feed = useFeed(activeId);
  const messages = useMemo(() => flattenFeed(feed.data), [feed.data]);
  const { typers, online } = useChatRealtime(activeId, me?._id);
  const markRead = useMarkRead();
  const actionsApi = useMessageActions(activeId ?? '');

  const setParam = useCallback(
    (patch: Record<string, string | null>) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      }),
    [setParams],
  );

  // Remember the unread count at open for the "New" divider, then mark the conversation read.
  const unreadAtOpen = useRef<{ id: string | null; count: number }>({ id: null, count: 0 });
  if (active && unreadAtOpen.current.id !== active._id) unreadAtOpen.current = { id: active._id, count: active.unread_count ?? 0 };
  const lastMessageId = messages[messages.length - 1]?._id;
  useEffect(() => {
    if (!activeId || !lastMessageId || document.visibilityState !== 'visible') return;
    markRead.mutate(activeId);
    // Mark read when opening and whenever new messages arrive while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, lastMessageId]);

  // Fall back to the first conversation on wide screens.
  useEffect(() => {
    if (!activeId && conversations.length && window.matchMedia('(min-width: 768px)').matches) setParam({ c: conversations[0]._id });
  }, [activeId, conversations, setParam]);

  const members = useMemo(() => {
    const map = new Map<string, MemberDetail>();
    conversations.forEach((c) => c.memberDetails?.forEach((m) => map.set(m._id, { ...map.get(m._id), ...m })));
    return map;
  }, [conversations]);

  const actions: MessageActions = useMemo(
    () => ({
      me: me?._id ?? '',
      isAdmin,
      members,
      online,
      onReply: (m: Message) => setParam({ thread: m.parent_message_id ?? m._id }),
      onReact: (m: Message, emoji: string) => actionsApi.react.mutate({ message_id: m._id, emoji, me: me?._id ?? '' }),
      onPin: (m: Message) => actionsApi.pin.mutate({ message_id: m._id, pinned: !m.pinned }),
      onEdit: (m: Message, body: string) => actionsApi.edit.mutate({ id: m._id, body, content: '' }),
      onDelete: (m: Message) =>
        confirm({
          title: 'Delete this message?',
          description: m.reply_count ? 'The thread replies stay; the message itself is replaced with “This message was deleted.”' : 'This can’t be undone.',
          confirmLabel: 'Delete',
          onConfirm: () => actionsApi.remove.mutateAsync(m._id),
        }),
      linkFor: (m: Message) => `${window.location.origin}/chat?c=${m.conversation_id}${m.parent_message_id ? `&thread=${m.parent_message_id}` : ''}&m=${m._id}`,
    }),
    [me?._id, isAdmin, members, online, setParam, actionsApi.react, actionsApi.pin, actionsApi.edit, actionsApi.remove, confirm],
  );

  const select = (id: string) => setParam({ c: id, thread: null, m: null });
  const roomTypers = activeId ? (typers[activeId] ?? []) : [];
  const mainTypers = roomTypers.filter((t) => !t.thread_id);
  const threadTypers = roomTypers.filter((t) => t.thread_id === threadId);
  const placeholder = active ? (active.type === 'channel' ? `Message #${conversationName(active)} (type # to link issues, docs or boards)` : `Message ${conversationName(active)}`) : '';

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      <div className={cn('w-full shrink-0 border-r border-border md:w-72', activeId ? 'hidden md:block' : 'block')}>
        <ConversationSidebar
          conversations={conversations}
          loading={convLoading}
          activeId={activeId}
          me={me?._id ?? ''}
          online={online}
          typers={typers}
          onSelect={select}
          onNewDm={() => setDmOpen(true)}
          onNewGroup={() => setGroupOpen(true)}
        />
      </div>

      <main className={cn('min-w-0 flex-1 flex-col bg-background', activeId ? 'flex' : 'hidden md:flex', threadId && 'hidden lg:flex')} aria-label={active ? conversationName(active) : 'Chat'}>
        {active ? (
          <>
            <ChannelHeader conversation={active} me={me?._id ?? ''} isAdmin={isAdmin} online={online} onJump={(mid, cid) => setParam({ c: cid, m: mid })} onBack={() => setParam({ c: null, thread: null })} />
            <BookmarksBar conversation={active} me={me?._id ?? ''} />
            <MessageFeed
              conversationKey={active._id}
              messages={messages}
              loading={feed.isPending}
              hasOlder={!!feed.hasNextPage}
              loadingOlder={feed.isFetchingNextPage}
              onLoadOlder={() => void feed.fetchNextPage()}
              actions={actions}
              unreadAtOpen={unreadAtOpen.current.count}
              highlightId={highlight}
              empty={
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  {active.type === 'channel' ? <Hash className="mb-3 size-8 text-subtle" /> : <Users className="mb-3 size-8 text-subtle" />}
                  <p className="text-sm font-medium">This is the start of {conversationName(active)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Say hello, share a doc, or link an issue with #.</p>
                </div>
              }
            />
            <div className="px-3 pb-3 sm:px-4">
              <TypingLine typers={mainTypers} className="px-1" />
              <ChatComposer conversationId={active._id} spaceId={active.type === 'channel' ? active.space_id : null} members={active.memberDetails ?? []} placeholder={placeholder} submitLabel="Send" ariaLabel={`Message ${conversationName(active)}`} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageSquarePlus className="mb-3 size-10 text-subtle" />
            <p className="text-sm font-medium">{convLoading ? 'Loading conversations…' : conversations.length ? 'Pick a conversation' : 'No conversations yet'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Message a teammate, start a group, or open a space channel.</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="brand" onClick={() => setDmOpen(true)}>
                New message
              </Button>
              <Button size="sm" variant="outline" onClick={() => setGroupOpen(true)}>
                New group
              </Button>
            </div>
          </div>
        )}
      </main>

      {active && threadId && (
        <div className="w-full shrink-0 border-l border-border lg:w-[26rem]">
          <ThreadPanel key={threadId} rootId={threadId} conversation={active} members={active.memberDetails ?? []} actions={actions} typers={threadTypers} onClose={() => setParam({ thread: null })} />
        </div>
      )}

      <StartDMDialog open={dmOpen} onOpenChange={setDmOpen} onCreated={select} />
      <CreateGroupDialog open={groupOpen} onOpenChange={setGroupOpen} onCreated={select} />
    </div>
  );
}
