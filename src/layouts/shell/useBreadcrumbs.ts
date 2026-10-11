import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useSpaceTree } from '@/features/spaces/queries';
import { entityPath } from '@/features/spaces/entity';
import type { Space } from '@/types/models';

export interface Crumb {
  label: string;
  to?: string;
}

type Located = { name?: string; title?: string; space_id?: string; folder_id?: string; group_id?: string; parent_id?: string };

/** Reads the first cached query matching a key prefix, re-rendering when the cache changes. */
export function useCachedData<T>(prefix: QueryKey | null): T | undefined {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();
  return useSyncExternalStore(
    (onChange) => cache.subscribe(onChange),
    () => {
      if (!prefix) return undefined;
      const match = queryClient.getQueriesData<T>({ queryKey: prefix }).find(([, data]) => data !== undefined);
      return match?.[1];
    },
  );
}

const STATIC_PAGES: Record<string, string> = {
  chat: 'Direct & Channels',
  notifications: 'Inbox',
  users: 'Members',
  recent: 'Recent',
  starred: 'Starred',
  trash: 'Trash',
};

const SETTINGS_TABS: Record<string, string> = {
  '': 'Profile',
  workspace: 'Workspace',
  members: 'Members & roles',
  teams: 'Teams',
  spaces: 'Spaces',
};

function trailFor(spaces: Space[], item: Located | undefined): Crumb[] {
  if (!item) return [];
  const crumbs: Crumb[] = [];
  const space = spaces.find((s) => s._id === item.space_id);
  if (space) crumbs.push({ label: space.name, to: `/space/${space._id}` });
  const parentId = item.folder_id || item.group_id || item.parent_id;
  if (parentId) {
    const parent = spaces.flatMap((s) => s.childs).find((c) => c._id === parentId);
    if (parent) {
      if (!space) {
        const owner = spaces.find((s) => s.childs.some((c) => c._id === parentId));
        if (owner) crumbs.push({ label: owner.name, to: `/space/${owner._id}` });
      }
      crumbs.push({ label: parent.name || parent.title || 'Folder', to: entityPath(parent) });
    }
  }
  return crumbs;
}

/** Breadcrumb trail for the current route: space › folder › item. */
export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const { spaces } = useSpaceTree();
  const [, section = '', id = ''] = pathname.split('/');

  const docKey = section === 'document' || section === 'single' || section === 'sheet' || section === 'whiteboard' ? ['documents', id] : null;
  const boardKey = section === 'board' || section === 'scrum' ? ['boards', id] : null;
  const containerKey = section === 'folder' || section === 'group' ? [section === 'folder' ? 'folders' : 'groups', id, 'contents'] : null;

  const doc = useCachedData<Located>(docKey);
  const board = useCachedData<Located | { board?: Located }>(boardKey);
  const container = useCachedData<Located[]>(containerKey);

  if (!section) return [{ label: 'All Files' }];
  if (STATIC_PAGES[section]) return [{ label: STATIC_PAGES[section] }];
  if (section === 'settings') return [{ label: 'Settings', to: '/settings' }, { label: SETTINGS_TABS[id] ?? id }];

  if (section === 'space') {
    const space = spaces.find((s) => s._id === id);
    return [{ label: space?.name ?? 'Space' }];
  }

  if (containerKey) {
    const item = container?.[0];
    const trail = trailFor(spaces, item).filter((c) => !c.to?.endsWith(id));
    return [...trail, { label: item?.name || item?.title || (section === 'folder' ? 'Folder' : 'Group') }];
  }

  if (docKey) {
    return [...trailFor(spaces, doc), { label: doc?.title || doc?.name || 'Untitled' }];
  }

  if (boardKey) {
    const data = (board as { board?: Located })?.board ?? (board as Located | undefined);
    return [...trailFor(spaces, data), { label: data?.name || data?.title || (section === 'scrum' ? 'Sprint board' : 'Board') }];
  }

  return [];
}
