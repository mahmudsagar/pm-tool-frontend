import type { EntityKind } from '@/features/spaces/entity';

/** Search-param values that open a route in the side panel (kept for old links). */
export const PANEL_TARGETS = ['_sidebar', '_popup'] as const;

export interface PeekTab {
  /** In-app path, also the search-param key, e.g. "/document/123". */
  path: string;
  section: string;
  id: string;
}

/** Open side-panel tabs in URL order; the last one is the active tab. */
export function readPeekTabs(search: string): PeekTab[] {
  const params = new URLSearchParams(search);
  const tabs: PeekTab[] = [];
  for (const [key, value] of params.entries()) {
    if (!(PANEL_TARGETS as readonly string[]).includes(value) || !key.startsWith('/')) continue;
    const [, section = '', id = ''] = key.split('/');
    tabs.push({ path: key, section, id });
  }
  return tabs;
}

/** Search string with the tab moved to the end (activated) or added. */
export function withTabActive(search: string, path: string): string {
  const params = new URLSearchParams(search);
  params.delete(path);
  params.set(path, '_sidebar');
  return params.toString();
}

export function withTabClosed(search: string, path: string): string {
  const params = new URLSearchParams(search);
  params.delete(path);
  return params.toString();
}

export function withAllTabsClosed(search: string): string {
  const params = new URLSearchParams(search);
  for (const tab of readPeekTabs(search)) params.delete(tab.path);
  return params.toString();
}

/** Best guess of the entity kind from the route section, refined later by data. */
export function kindFromSection(section: string, pageType?: string | null): EntityKind {
  switch (section) {
    case 'space':
      return 'space';
    case 'folder':
      return 'folder';
    case 'group':
      return 'group';
    case 'board':
      return 'board';
    case 'scrum':
      return 'scrum';
    case 'sheet':
      return 'sheet';
    case 'whiteboard':
      return 'whiteboard';
    default:
      return pageType === 'sheet' || pageType === 'whiteboard' ? pageType : 'document';
  }
}
