import {
  FileText,
  Folder,
  FolderKanban,
  LayoutGrid,
  Lock,
  MessageSquare,
  PenTool,
  Server,
  Sheet,
  SquareKanban,
  type LucideIcon,
} from 'lucide-react';
import { resolveBoardListPageType } from '@/components/elements/dataView/scrum/scrumBoardConstants';
import type { EntityType } from '@/types/models';

/** What a node in the space tree is, for icons, labels and routing. */
export type EntityKind =
  | 'space'
  | 'folder'
  | 'group'
  | 'document'
  | 'sheet'
  | 'whiteboard'
  | 'board'
  | 'scrum';

interface EntityLike {
  _id?: string;
  id?: string;
  entity_type?: EntityType | string;
  type?: string;
  page_type?: string | null;
  is_private?: boolean;
  custom_meta?: unknown;
}

export function entityKind(item: EntityLike | null | undefined): EntityKind {
  const type = item?.entity_type ?? item?.type;
  if (type === 'space' || type === 'folder' || type === 'group') return type;
  const pageType = (item && resolveBoardListPageType({ ...item, page_type: item.page_type ?? undefined } as never)) || item?.page_type;
  if (pageType === 'scrum') return 'scrum';
  if (type === 'board' || pageType === 'board') return 'board';
  if (pageType === 'sheet' || pageType === 'whiteboard') return pageType;
  return 'document';
}

export const KIND_META: Record<EntityKind, { label: string; icon: LucideIcon }> = {
  space: { label: 'Space', icon: Server },
  folder: { label: 'Folder', icon: Folder },
  group: { label: 'Group', icon: FolderKanban },
  document: { label: 'Document', icon: FileText },
  sheet: { label: 'Sheet', icon: Sheet },
  whiteboard: { label: 'Whiteboard', icon: PenTool },
  board: { label: 'Databoard', icon: LayoutGrid },
  scrum: { label: 'Sprint Board', icon: SquareKanban },
};

export function entityIcon(item: EntityLike | null | undefined): LucideIcon {
  const kind = entityKind(item);
  if (kind === 'space' && item?.is_private) return Lock;
  return KIND_META[kind].icon;
}

export const ChatIcon = MessageSquare;

/** In-app route for an entity. Every page type renders through /document/:id. */
export function entityPath(item: EntityLike | null | undefined): string {
  const id = item?._id ?? item?.id;
  if (!id) return '/';
  switch (entityKind(item)) {
    case 'space':
      return `/space/${id}`;
    case 'folder':
      return `/folder/${id}`;
    case 'group':
      return `/group/${id}`;
    case 'scrum':
      return `/scrum/${id}`;
    case 'board':
      return `/board/${id}`;
    default:
      return `/document/${id}`;
  }
}

export function isContainerKind(kind: EntityKind) {
  return kind === 'space' || kind === 'folder' || kind === 'group';
}
