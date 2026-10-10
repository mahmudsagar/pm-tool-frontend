import type { LucideIcon } from 'lucide-react';
import { formatEntityTypeLabel, getEntityRawName, resolveEntityPageType } from '@/utils/fileDisplayUtils';
import { entityIcon, entityKind, entityPath, type EntityKind } from './entity';
import type { EntityType, Space, SpaceChild } from '@/types/models';

/** Row shape for file lists (hub, space/folder/group pages, search results). */
export interface FileRow {
  id: string;
  type: EntityType;
  kind: EntityKind;
  icon: LucideIcon;
  /** Plain name without type suffix. */
  name: string;
  /** Kept for older table code that reads rawName. */
  rawName: string;
  typeLabel: string;
  spaceName: string;
  /** "Space / Folder" location label. */
  path: string;
  href: string;
  updatedAt: string | null;
  createdAt: string | null;
  /** Who last changed it (falls back to the creator). */
  modifiedById: string | null;
  ownerId: string | null;
  sharedMembers: string[];
  sharing: 'Private' | 'Public';
  pinned?: boolean;
  space_id?: string;
  folder_id: string | null;
  group_id: string | null;
  page_type: string | null;
}

interface RowContext {
  spaces: Pick<Space, '_id' | 'name'>[];
  /** Name of the container the rows were loaded from, appended to the path. */
  parentName?: string;
}

export function toFileRows(children: SpaceChild[], { spaces, parentName }: RowContext): FileRow[] {
  const spaceNames = new Map(spaces.map((s) => [String(s._id), s.name]));
  return children.map((child) => {
    const spaceName = (child.space_id && spaceNames.get(String(child.space_id))) || '';
    const path = [spaceName, parentName].filter(Boolean).join(' / ');
    return {
      id: child._id,
      type: child.entity_type,
      kind: entityKind(child),
      icon: entityIcon(child),
      name: getEntityRawName(child) || 'Untitled',
      rawName: getEntityRawName(child),
      typeLabel: formatEntityTypeLabel(child),
      spaceName,
      path,
      href: entityPath(child),
      updatedAt: child.updatedAt ?? child.createdAt ?? null,
      createdAt: child.createdAt ?? null,
      modifiedById: (child.last_updated_by as string) || child.user_id || null,
      ownerId: child.user_id ?? null,
      sharedMembers: Array.isArray(child.shared_members) ? (child.shared_members as string[]) : [],
      sharing: child.is_private ? 'Private' : 'Public',
      pinned: child.pinned,
      space_id: child.space_id,
      folder_id: child.folder_id || child.parent_id || null,
      group_id: child.group_id || null,
      page_type: resolveEntityPageType(child) || null,
    };
  });
}
