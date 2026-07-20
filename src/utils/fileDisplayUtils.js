import { resolveBoardListPageType } from '@/components/elements/dataView/scrum/scrumBoardConstants';

/** @param {string | undefined | null} entityType */
export function isContainerEntity(entityType) {
  return entityType === 'folder' || entityType === 'group' || entityType === 'space';
}

/** @param {{ entity_type?: string, type?: string, page_type?: string, custom_meta?: { board_kind?: string } } | null | undefined} item */
export function resolveEntityPageType(item) {
  if (!item) return null;
  return resolveBoardListPageType(item) || item.page_type || null;
}

/** @param {{ entity_type?: string, type?: string, name?: string, title?: string } | null | undefined} item */
export function getEntityRawName(item) {
  if (!item) return '';
  const entityType = item.entity_type || item.type;
  if (isContainerEntity(entityType)) {
    return item.name || item.title || '';
  }
  return item.title || item.name || '';
}

/** @param {{ entity_type?: string, type?: string, name?: string, title?: string, page_type?: string, custom_meta?: { board_kind?: string } } | null | undefined} item */
export function formatEntityDisplayName(item) {
  if (!item) return '';
  const entityType = item.entity_type || item.type;
  if (isContainerEntity(entityType)) {
    return item.name || item.title || '';
  }
  const pageType = resolveEntityPageType(item);
  const rawName = getEntityRawName(item);
  if (!rawName) return '';
  if (!pageType) return rawName;
  if (rawName.endsWith(`.${pageType}`)) return rawName;
  return `${rawName}.${pageType}`;
}

/** @param {{ entity_type?: string, type?: string, page_type?: string, custom_meta?: { board_kind?: string } } | null | undefined} item */
export function formatEntityTypeLabel(item) {
  if (!item) return '';
  const entityType = item.entity_type || item.type;
  if (entityType === 'folder') return 'Folder';
  if (entityType === 'group') return 'Group';
  if (entityType === 'space') return 'Space';
  const pageType = resolveEntityPageType(item);
  if (pageType) {
    return pageType.charAt(0).toUpperCase() + pageType.slice(1);
  }
  if (entityType === 'page' || entityType === 'board') return 'Page';
  if (!entityType) return '';
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}
