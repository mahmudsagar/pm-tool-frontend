import { useEffect, useRef, useState } from 'react';
import { useSocket } from './socket';

export type PresenceEntity = 'page' | 'board' | 'folder' | 'space';

export interface PresenceUser {
  user_id: string;
  name?: string;
  avatar?: string;
  editing: boolean;
  since: string;
}

interface PresenceUpdate {
  entity_type: PresenceEntity;
  entity_id: string;
  users: PresenceUser[];
}

/**
 * Who else is viewing or editing an entity right now (presence only; no co-editing).
 * Pass `editing` while the current user is actively typing/drawing.
 */
export function usePresence(entityType: PresenceEntity, entityId: string | null | undefined, editing = false) {
  const socket = useSocket();
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const editingRef = useRef(editing);

  useEffect(() => {
    if (!socket || !entityId) return;
    const payload = { entity_type: entityType, entity_id: entityId };
    const onUpdate = (update: PresenceUpdate) => {
      if (update?.entity_id === entityId && update.entity_type === entityType) setUsers(update.users ?? []);
    };
    const join = () =>
      socket.emit('presence:join', payload, (ack?: { ok: boolean; users?: PresenceUser[] }) => {
        if (ack?.ok && ack.users) setUsers(ack.users);
        if (editingRef.current) socket.emit('presence:editing', { ...payload, editing: true });
      });

    socket.on('presence:update', onUpdate);
    // Re-join after reconnects; the server forgets rooms when the socket drops.
    socket.on('connect', join);
    if (socket.connected) join();

    return () => {
      socket.emit('presence:leave', payload);
      socket.off('presence:update', onUpdate);
      socket.off('connect', join);
      setUsers([]);
    };
  }, [socket, entityType, entityId]);

  useEffect(() => {
    if (editingRef.current === editing) return;
    editingRef.current = editing;
    if (socket?.connected && entityId) socket.emit('presence:editing', { entity_type: entityType, entity_id: entityId, editing });
  }, [editing, socket, entityType, entityId]);

  return users;
}

/** True for a short while after each call to `ping()`; used to report "editing". */
export function useActivityFlag(idleMs = 4000) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const ping = () => {
    setActive(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(false), idleMs);
  };
  return [active, ping] as const;
}
