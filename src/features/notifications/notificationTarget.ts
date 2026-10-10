import { entityPath } from '@/features/spaces/entity';

export interface AppNotification {
  _id: string;
  action?: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  is_read?: boolean;
  createdAt?: string;
  metadata?: { actor_name?: string; conversation_id?: string; page_type?: string };
}

/** Where a notification leads, or null when it has no destination. */
export function notificationTarget(n: AppNotification): string | null {
  if (n.action === 'mention' || n.entity_type === 'conversation') {
    const conversationId = n.metadata?.conversation_id || n.entity_id;
    return conversationId ? `/chat?c=${conversationId}` : '/chat';
  }
  if (!n.entity_id || n.action === 'delete') return null;
  if (['page', 'board', 'space', 'folder', 'group'].includes(n.entity_type ?? '')) {
    return entityPath({ _id: n.entity_id, entity_type: n.entity_type, page_type: n.metadata?.page_type });
  }
  return null;
}
