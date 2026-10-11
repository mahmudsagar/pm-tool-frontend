import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';

/* ---------------------------------------------------------------- types */

export interface MemberDetail {
  _id: string;
  name?: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  role?: string | null;
  title?: string | null;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  entity_type?: string;
  entity_id?: string;
  added_by?: string;
  added_at?: string;
}

export interface Conversation {
  _id: string;
  type: 'dm' | 'channel' | 'group';
  name?: string;
  displayName?: string;
  description?: string;
  topic?: string;
  space_id?: string;
  spaceInfo?: { _id: string; name: string } | null;
  members: string[];
  memberDetails?: MemberDetail[];
  created_by: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count?: number;
  mention_count?: number;
  pinned?: boolean;
  muted?: boolean;
  pinned_count?: number;
  bookmarks?: Bookmark[];
}

export interface Reaction {
  emoji: string;
  user_ids: string[];
}

export interface EntityRef {
  id: string;
  type: string;
  title: string;
  status?: string;
  board_name?: string;
  url?: string;
}

export interface Message {
  _id: string;
  clientId?: string;
  conversation_id: string;
  sender_id: string;
  body?: string;
  content?: string | null;
  mentions?: string[];
  entity_refs?: EntityRef[];
  attachments?: unknown[];
  mediaAttachments?: { _id: string; url: string; caption?: string }[];
  pendingAttachments?: { name: string; previewUrl: string | null }[];
  senderInfo?: { _id: string; name?: string; avatarUrl?: string; avatar?: string };
  parent_message_id?: string | null;
  reply_count?: number;
  last_reply_at?: string | null;
  reply_user_ids?: string[];
  reactions?: Reaction[];
  edited_at?: string | null;
  deleted_at?: string | null;
  pinned?: boolean;
  pinned_by?: string | null;
  createdAt: string;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
}

export interface SearchHit extends Message {
  conversationName?: string;
}

type Page = { messages: Message[]; has_more: boolean };

/* ---------------------------------------------------------------- keys */

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  feed: (id: string) => ['chat', 'feed', id] as const,
  thread: (id: string) => ['chat', 'thread', id] as const,
  pinned: (id: string) => ['chat', 'pinned', id] as const,
};

/* -------------------------------------------------------------- queries */

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: async () => (await http.get<Conversation[]>('/v1/chat/conversation')) ?? [],
    staleTime: 30_000,
  });
}

export function useFeed(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: chatKeys.feed(conversationId ?? ''),
    enabled: !!conversationId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      http.get<Page>('/v1/chat/message', { query: { conversation_id: conversationId, page: 1, limit: 50, before: pageParam ?? undefined } }),
    getNextPageParam: (last) => (last.has_more && last.messages[0] ? last.messages[0].createdAt : undefined),
    staleTime: 10_000,
  });
}

/** Feed pages flattened oldest → newest. */
export function flattenFeed(data: InfiniteData<Page> | undefined): Message[] {
  if (!data) return [];
  return [...data.pages].reverse().flatMap((p) => p.messages);
}

export function useThread(rootId: string | null) {
  return useQuery({
    queryKey: chatKeys.thread(rootId ?? ''),
    enabled: !!rootId,
    queryFn: () => http.get<{ root: Message; replies: Message[] }>('/v1/chat/message', { query: { thread_id: rootId } }),
  });
}

export function usePinned(conversationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.pinned(conversationId ?? ''),
    enabled: !!conversationId && enabled,
    queryFn: () => http.get<Message[]>('/v1/chat/message', { query: { conversation_id: conversationId, pinned: 'true' } }),
  });
}

export function useMessageSearch(q: string, conversationId?: string) {
  return useQuery({
    queryKey: ['chat', 'search', q, conversationId ?? ''],
    enabled: q.trim().length >= 2,
    queryFn: () => http.get<SearchHit[]>('/v1/chat/message/search', { query: { q: q.trim(), conversation_id: conversationId } }),
    staleTime: 10_000,
  });
}

/* --------------------------------------------------------- cache helpers */

/** Applies `fn` to every cached copy of a message (feed pages, thread root and replies). */
export function patchMessageEverywhere(qc: QueryClient, conversationId: string, messageId: string, fn: (m: Message) => Message) {
  qc.setQueryData<InfiniteData<Page>>(chatKeys.feed(conversationId), (old) =>
    old ? { ...old, pages: old.pages.map((p) => ({ ...p, messages: p.messages.map((m) => (m._id === messageId ? fn(m) : m)) })) } : old,
  );
  qc.setQueriesData<{ root: Message; replies: Message[] }>({ queryKey: ['chat', 'thread'] }, (old) =>
    old
      ? {
          root: old.root._id === messageId ? fn(old.root) : old.root,
          replies: old.replies.map((m) => (m._id === messageId ? fn(m) : m)),
        }
      : old,
  );
}

/** A still-sending optimistic copy of `m` (the socket echo can beat the POST response). */
function isPendingTwin(x: Message, m: Message) {
  return x.status === 'sending' && !!x.clientId && x.sender_id === m.sender_id && (x.body ?? '') === (m.body ?? '') && (x.parent_message_id ?? null) === (m.parent_message_id ?? null);
}

function dedupe(list: Message[]) {
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m._id) ? false : (seen.add(m._id), true)));
}

/**
 * Inserts or replaces a message in the feed (top-level) or its thread (reply).
 * Matching by clientId swaps an optimistic message for the saved one; the socket echo
 * of the same message may already be there, so results are de-duplicated by id.
 */
export function upsertMessage(qc: QueryClient, message: Message) {
  if (message.parent_message_id) {
    qc.setQueryData<{ root: Message; replies: Message[] }>(chatKeys.thread(message.parent_message_id), (old) => {
      if (!old) return old;
      let i = old.replies.findIndex((m) => m._id === message._id || (message.clientId && m.clientId === message.clientId));
      if (i < 0) i = old.replies.findIndex((m) => isPendingTwin(m, message));
      if (i >= 0) {
        const replies = [...old.replies];
        replies[i] = { ...replies[i], ...message, clientId: replies[i].clientId ?? message.clientId };
        return { ...old, replies: dedupe(replies.map((m) => (m._id === message._id ? { ...m, ...message } : m))) };
      }
      return { ...old, replies: [...old.replies, message] };
    });
    return;
  }
  qc.setQueryData<InfiniteData<Page>>(chatKeys.feed(message.conversation_id), (old) => {
    if (!old) return old;
    let found = false;
    const pages = old.pages.map((p) => ({
      ...p,
      messages: dedupe(p.messages.map((m) => {
        if (m._id === message._id || (message.clientId && m.clientId === message.clientId)) {
          found = true;
          return { ...m, ...message };
        }
        return m;
      })),
    }));
    if (!found && pages[0]) {
      const twin = pages[0].messages.findIndex((m) => isPendingTwin(m, message));
      if (twin >= 0) {
        const messages = [...pages[0].messages];
        messages[twin] = { ...messages[twin], ...message, clientId: messages[twin].clientId };
        pages[0] = { ...pages[0], messages: dedupe(messages) };
      } else pages[0] = { ...pages[0], messages: [...pages[0].messages, message] };
    }
    return { ...old, pages };
  });
}

/* ------------------------------------------------------------ mutations */

export interface SendInput {
  conversation_id: string;
  body: string;
  content?: string | null;
  mentions?: string[];
  entity_refs?: EntityRef[];
  parent_message_id?: string | null;
}

export function useSendMessage() {
  return useMutation({ mutationFn: (body: SendInput) => http.post<Message>('/v1/chat/message', { ...body, attachments: [] }) });
}

export function useUploadChatFile() {
  return useMutation({ mutationFn: (form: FormData) => http.upload<{ _id: string; url: string; caption?: string }>('/v1/upload/media', form) });
}

export function useMessageActions(conversationId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = (e: unknown) => toast({ variant: 'destructive', title: 'Something went wrong', description: (e as Error).message });
  return {
    edit: useMutation({
      mutationFn: (v: { id: string; body: string; content?: string | null; mentions?: string[] }) => http.put<Message>('/v1/chat/message', v),
      onSuccess: (m) => m && patchMessageEverywhere(qc, conversationId, m._id, (old) => ({ ...old, ...m })),
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => http.delete('/v1/chat/message', { query: { id } }),
      onMutate: (id) => patchMessageEverywhere(qc, conversationId, id, (m) => ({ ...m, deleted_at: new Date().toISOString(), body: '', content: null, entity_refs: [], mediaAttachments: [] })),
      onError,
    }),
    react: useMutation({
      mutationFn: (v: { message_id: string; emoji: string; me: string }) => http.post<Reaction[]>('/v1/chat/message/reaction', { message_id: v.message_id, emoji: v.emoji }),
      onMutate: ({ message_id, emoji, me }) =>
        patchMessageEverywhere(qc, conversationId, message_id, (m) => {
          const list = [...(m.reactions ?? [])];
          const i = list.findIndex((r) => r.emoji === emoji);
          if (i < 0) list.push({ emoji, user_ids: [me] });
          else {
            const has = list[i].user_ids.includes(me);
            const ids = has ? list[i].user_ids.filter((u) => u !== me) : [...list[i].user_ids, me];
            if (ids.length) list[i] = { emoji, user_ids: ids };
            else list.splice(i, 1);
          }
          return { ...m, reactions: list };
        }),
      onError,
    }),
    pin: useMutation({
      mutationFn: (v: { message_id: string; pinned: boolean }) => http.post<Message>('/v1/chat/message/pin', v),
      onMutate: ({ message_id, pinned }) => patchMessageEverywhere(qc, conversationId, message_id, (m) => ({ ...m, pinned })),
      onSettled: () => {
        void qc.invalidateQueries({ queryKey: chatKeys.pinned(conversationId) });
        void qc.invalidateQueries({ queryKey: chatKeys.conversations });
      },
      onError,
    }),
  };
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => http.post('/v1/chat/conversation/read', { conversation_id: conversationId }),
    onMutate: (id) =>
      qc.setQueryData<Conversation[]>(chatKeys.conversations, (old) => old?.map((c) => (c._id === id ? { ...c, unread_count: 0, mention_count: 0 } : c))),
  });
}

export interface ConversationPatch {
  id: string;
  name?: string;
  description?: string;
  topic?: string;
  pinned?: boolean;
  muted?: boolean;
  bookmarks?: Bookmark[];
  add_members?: string[];
  remove_members?: string[];
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (patch: ConversationPatch) => http.put<Conversation>('/v1/chat/conversation', patch),
    onMutate: (patch) =>
      qc.setQueryData<Conversation[]>(chatKeys.conversations, (old) =>
        old?.map((c) => {
          if (c._id !== patch.id) return c;
          const { id: _id, add_members: _a, remove_members: _r, ...rest } = patch;
          return { ...c, ...rest };
        }),
      ),
    onError: (e) => toast({ variant: 'destructive', title: 'Could not update the conversation', description: (e as Error).message }),
    onSettled: () => void qc.invalidateQueries({ queryKey: chatKeys.conversations }),
  });
}
