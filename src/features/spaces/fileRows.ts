import { File, FileSpreadsheet, FileText, Folder, LayoutGrid, SquareKanban, StickyNote, Users, type LucideIcon } from 'lucide-react';
import { formatTime } from '@/utils/helper';
import {
  buildSpaceNameMap,
  formatEntityDisplayName,
  formatEntityTypeLabel,
  getEntityRawName,
  resolveEntityPageType,
  resolveSpaceName,
} from '@/utils/fileDisplayUtils';
import type { EntityType, Space, SpaceChild } from '@/types/models';

/** Row shape consumed by the file tables (Home, folder/group/space views). */
export interface FileRow {
  id: string;
  type: EntityType;
  icon: LucideIcon;
  name: string;
  rawName: string;
  typeLabel: string;
  spaceName: string;
  modified: string;
  modifiedBy: string;
  sharing: 'Private' | 'Public';
  pinned?: boolean;
  space_id?: string;
  folder_id: string | null;
  group_id: string | null;
  page_type: string | null;
}

const PAGE_ICONS: Record<string, LucideIcon> = {
  document: FileText,
  whiteboard: StickyNote,
  sheet: FileSpreadsheet,
  board: LayoutGrid,
  scrum: SquareKanban,
};

function iconFor(child: SpaceChild, pageType: string | null): LucideIcon {
  if (child.entity_type === 'folder') return Folder;
  if (child.entity_type === 'group') return Users;
  return (pageType && PAGE_ICONS[pageType]) || File;
}

export function toFileRows(children: SpaceChild[], spaces: Pick<Space, '_id' | 'name'>[], fallbackSpaceName = ''): FileRow[] {
  const spaceNames = buildSpaceNameMap(spaces);
  return children.map((child) => {
    const pageType = resolveEntityPageType(child);
    return {
      id: child._id,
      type: child.entity_type,
      icon: iconFor(child, pageType),
      name: formatEntityDisplayName(child),
      rawName: getEntityRawName(child),
      typeLabel: formatEntityTypeLabel(child),
      spaceName: resolveSpaceName(child.space_id, spaceNames, fallbackSpaceName),
      modified: formatTime(child.updatedAt),
      modifiedBy: (child.updated_by_name as string) || (child.user_name as string) || '—',
      sharing: child.is_private ? 'Private' : 'Public',
      pinned: child.pinned,
      space_id: child.space_id,
      folder_id: child.folder_id || child.parent_id || null,
      group_id: child.group_id || null,
      page_type: pageType || null,
    };
  });
}
