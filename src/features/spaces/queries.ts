import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';
import { toFileRows, type FileRow } from './fileRows';
import type { EntityType, Space, SpaceChild } from '@/types/models';

/**
 * Server state for the space tree. React Query is the only source of truth:
 * after any create/rename/move/delete, call `invalidateSpaceData()` instead of
 * patching local copies.
 */

export const spaceKeys = {
  all: ['spaces'] as const,
  tree: (workspaceId: string | undefined) => ['spaces', 'tree', workspaceId ?? 'none'] as const,
};

export type ContainerType = 'folder' | 'group';

export const containerKeys = {
  contents: (type: ContainerType, id: string) => [type === 'folder' ? 'folders' : 'groups', id, 'contents'] as const,
};

const byPinnedFirst = <T extends { pinned?: boolean }>(a: T, b: T) => Number(!!b.pinned) - Number(!!a.pinned);

export interface SpaceTree {
  spaces: Space[];
  privateSpaces: Space[];
  publicSpaces: Space[];
  /** Direct children of every space, newest first, shaped for file tables. */
  files: FileRow[];
}

export function buildSpaceTree(raw: Space[]): SpaceTree {
  const spaces = raw.map((space) => ({
    ...space,
    // Children of a private space are private regardless of their own flag.
    childs: [...(space.childs ?? [])]
      .sort(byPinnedFirst)
      .map((child) => ({
        ...child,
        space_id: child.space_id || space._id,
        is_private: space.is_private ?? child.is_private,
      })),
  }));

  const children = spaces
    .flatMap((space) => space.childs)
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());

  return {
    spaces,
    privateSpaces: spaces.filter((s) => s.is_private).sort(byPinnedFirst),
    publicSpaces: spaces.filter((s) => !s.is_private).sort(byPinnedFirst),
    files: toFileRows(children, spaces),
  };
}

async function fetchSpaces(userId: string): Promise<Space[]> {
  try {
    return (await http.get<Space[]>('/v1/space', { query: { user_id: userId } })) ?? [];
  } catch (error) {
    // The server answers 404 when the workspace has no spaces yet.
    if (error instanceof ApiError && error.isNotFound) return [];
    throw error;
  }
}

export function useSpaceTree() {
  const userId = useAuthStore((s) => s.user?._id);
  const workspaceId = useAuthStore((s) => s.currentWorkspace?._id);
  const query = useQuery({
    queryKey: spaceKeys.tree(workspaceId),
    queryFn: () => fetchSpaces(userId as string),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
  const tree = useMemo(() => buildSpaceTree(query.data ?? []), [query.data]);
  return { ...query, ...tree };
}

export function useContainerContents(type: ContainerType, id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: containerKeys.contents(type, id ?? ''),
    queryFn: async () => (await http.get<SpaceChild[]>(`/v1/${type}`, { query: { id } })) ?? [],
    enabled: enabled && !!id,
    staleTime: 60 * 1000,
  });
}

/** Refetches every query that renders part of the space tree. */
export function invalidateSpaceData(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) => ['spaces', 'folders', 'groups'].includes(String(queryKey[0])),
  });
}

export function useInvalidateSpaceData() {
  const queryClient = useQueryClient();
  return useCallback(() => invalidateSpaceData(queryClient), [queryClient]);
}

const PIN_ENDPOINTS: Partial<Record<EntityType, string>> = {
  page: '/v1/page/document',
  folder: '/v1/folder',
  group: '/v1/group',
  space: '/v1/space',
};

export function useTogglePin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, type, pinned }: { id: string; type: EntityType; pinned: boolean }) => {
      const endpoint = PIN_ENDPOINTS[type];
      if (!endpoint) throw new Error(`Cannot pin a ${type}.`);
      return http.put(endpoint, { id, entity_type: type, pinned }, { query: { id } });
    },
    onSuccess: (_data, { pinned }) => {
      toast({ title: pinned ? 'Pinned' : 'Unpinned' });
    },
    onError: (error) => {
      toast({ title: 'Could not update pin', description: (error as Error).message, variant: 'destructive' });
    },
    onSettled: () => invalidateSpaceData(queryClient),
  });
}
