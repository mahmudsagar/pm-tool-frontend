import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/lib/realtime/socket';
import { chatKeys, patchMessageEverywhere, upsertMessage, type Conversation, type Message, type Reaction } from './api';

export interface Typer {
  user_id: string;
  name: string;
  thread_id: string | null;
  at: number;
}

const TYPING_TTL = 6000;

/**
 * Wires chat socket events into the query cache and tracks typing and presence.
 * Joins the active conversation's room while it is open.
 */
export function useChatRealtime(activeId: string | null, me: string | undefined) {
  const socket = useSocket();
  const qc = useQueryClient();
  const [typers, setTypers] = useState<Record<string, Typer[]>>({});
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;
    const onMessage = (event: { data?: Message } | Message) => {
      const message = ('data' in event && event.data ? event.data : event) as Message;
      if (!message?.conversation_id) return;
      upsertMessage(qc, { ...message, status: message.sender_id === me ? 'delivered' : undefined });
      // A new message ends that person's typing indicator.
      setTypers((prev) => ({ ...prev, [message.conversation_id]: (prev[message.conversation_id] ?? []).filter((t) => t.user_id !== message.sender_id) }));
      if (message.conversation_id !== activeId && message.sender_id !== me) {
        void qc.invalidateQueries({ queryKey: chatKeys.conversations });
      } else {
        qc.setQueryData<Conversation[]>(chatKeys.conversations, (old) =>
          old?.map((c) => (c._id === message.conversation_id ? { ...c, last_message_at: message.createdAt, last_message_preview: message.body?.slice(0, 120) } : c)),
        );
      }
    };
    const onUpdated = (event: { data?: Message } | Message) => {
      const message = ('data' in event && event.data ? event.data : event) as Message;
      if (message?._id) patchMessageEverywhere(qc, message.conversation_id, message._id, (m) => ({ ...m, ...message }));
    };
    const onDeleted = (e: { conversation_id: string; message_id: string }) =>
      patchMessageEverywhere(qc, e.conversation_id, e.message_id, (m) => ({ ...m, deleted_at: new Date().toISOString(), body: '', content: null, entity_refs: [], mediaAttachments: [] }));
    const onReaction = (e: { conversation_id: string; message_id: string; reactions: Reaction[] }) =>
      patchMessageEverywhere(qc, e.conversation_id, e.message_id, (m) => ({ ...m, reactions: e.reactions }));
    const onTyping = (e: { conversation_id: string; thread_id?: string | null; user_id: string; name?: string; typing: boolean }) => {
      if (e.user_id === me) return;
      setTypers((prev) => {
        const list = (prev[e.conversation_id] ?? []).filter((t) => t.user_id !== e.user_id || (t.thread_id ?? null) !== (e.thread_id ?? null));
        if (e.typing) list.push({ user_id: e.user_id, name: e.name ?? 'Someone', thread_id: e.thread_id ?? null, at: Date.now() });
        return { ...prev, [e.conversation_id]: list };
      });
    };
    const onRead = (e: { conversation_id: string }) =>
      qc.setQueryData<Conversation[]>(chatKeys.conversations, (old) => old?.map((c) => (c._id === e.conversation_id ? { ...c, unread_count: 0, mention_count: 0 } : c)));
    const onConversation = () => void qc.invalidateQueries({ queryKey: chatKeys.conversations });
    const onPresence = (e: { user_id: string; online: boolean }) =>
      setOnline((prev) => {
        const next = new Set(prev);
        if (e.online) next.add(e.user_id);
        else next.delete(e.user_id);
        return next;
      });

    socket.on('chat:message', onMessage);
    socket.on('chat:message_updated', onUpdated);
    socket.on('chat:message_deleted', onDeleted);
    socket.on('chat:reaction', onReaction);
    socket.on('chat:typing', onTyping);
    socket.on('chat:read', onRead);
    socket.on('chat:conversation_updated', onConversation);
    socket.on('chat:presence', onPresence);
    const loadPresence = () => socket.emit('chat:presence:list', (res: { online?: string[] }) => setOnline(new Set(res?.online ?? [])));
    loadPresence();
    socket.on('connect', loadPresence);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:message_updated', onUpdated);
      socket.off('chat:message_deleted', onDeleted);
      socket.off('chat:reaction', onReaction);
      socket.off('chat:typing', onTyping);
      socket.off('chat:read', onRead);
      socket.off('chat:conversation_updated', onConversation);
      socket.off('chat:presence', onPresence);
      socket.off('connect', loadPresence);
    };
  }, [socket, qc, me, activeId]);

  // Join the open conversation's room (re-joins after reconnects).
  useEffect(() => {
    if (!socket || !activeId) return;
    const join = () => socket.emit('conversation:join', activeId);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('conversation:leave', activeId);
    };
  }, [socket, activeId]);

  // Expire stale typing indicators (missed "stopped typing" events).
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      setTypers((prev) => {
        let changed = false;
        const next: Record<string, Typer[]> = {};
        for (const [k, list] of Object.entries(prev)) {
          next[k] = list.filter((x) => now - x.at < TYPING_TTL);
          if (next[k].length !== list.length) changed = true;
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return { typers, online };
}

/** Returns a function to call on each keystroke; emits typing start/stop with throttling. */
export function useTypingEmitter(conversationId: string | null, threadId: string | null = null) {
  const socket = useSocket();
  const last = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout>>();
  const typing = useRef(false);

  const stop = useCallback(() => {
    clearTimeout(stopTimer.current);
    if (socket && conversationId && typing.current) socket.emit('chat:typing', { conversation_id: conversationId, thread_id: threadId, typing: false });
    typing.current = false;
  }, [socket, conversationId, threadId]);

  const ping = useCallback(
    (hasText: boolean) => {
      if (!socket || !conversationId) return;
      if (!hasText) return stop();
      const now = Date.now();
      if (!typing.current || now - last.current > 2500) {
        socket.emit('chat:typing', { conversation_id: conversationId, thread_id: threadId, typing: true });
        last.current = now;
        typing.current = true;
      }
      clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(stop, 4000);
    },
    [socket, conversationId, threadId, stop],
  );

  useEffect(() => stop, [stop]);
  return { ping, stop };
}
