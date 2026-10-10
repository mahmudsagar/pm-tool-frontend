import { useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import { useToast } from '@/components/ui/use-toast';
import { invalidateSpaceData } from '@/features/spaces/queries';

/** Entity types as the API names them. */
export type ApiEntityType = 'space' | 'folder' | 'group' | 'board' | 'page';

export interface LibraryEntity {
  _id: string;
  name?: string;
  title?: string;
  page_type?: string;
  space_id?: string;
  folder_id?: string;
  group_id?: string;
  is_private?: boolean;
  updatedAt?: string;
}

export interface FavoriteRecord {
  _id: string;
  entity_type: ApiEntityType;
  entity_id: string;
  created_at: string;
  entity: LibraryEntity;
}

export interface RecentRecord {
  entity_type: ApiEntityType;
  entity_id: string;
  viewed_at: string;
  entity: LibraryEntity;
}

export interface TrashRecord {
  _id: string;
  entity_type: ApiEntityType;
  entity_id: string;
  name: string;
  page_type?: string | null;
  parent?: { space_id?: string; folder_id?: string; group_id?: string; parent_id?: string };
  deleted_at: string;
  expires_at: string;
  deleted_by?: { _id: string; name?: string; email?: string; avatar?: string } | null;
  item_count: number;
}

export interface StorageUsage {
  used_bytes: number;
  quota_bytes: number | null;
  by_type: { images: number; documents: number; other: number };
  file_count: number;
  active_contributors: number;
}

const useWorkspaceId = () => useAuthStore((s) => s.currentWorkspace?._id ?? 'none');

export const libraryKeys = {
  favorites: (ws: string) => ['favorites', ws] as const,
  recent: (ws: string) => ['recent', ws] as const,
  trash: (ws: string) => ['trash', ws] as const,
  storage: (ws: string) => ['storage', ws] as const,
};

/** Maps a UI kind or raw entity to the API's entity type. */
export function toApiEntityType(entityType?: string, pageType?: string | null): ApiEntityType {
  if (entityType === 'space' || entityType === 'folder' || entityType === 'group' || entityType === 'board') return entityType;
  if (pageType === 'board' || pageType === 'scrum') return 'board';
  return 'page';
}

// ── Favorites ────────────────────────────────────────────────────────────────

export function useFavorites() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: libraryKeys.favorites(ws),
    queryFn: async () => (await http.get<FavoriteRecord[]>('/v1/favorite')) ?? [],
    staleTime: 60 * 1000,
  });
}

/** Set of starred entity ids, for quick lookups in lists. */
export function useFavoriteIds() {
  const { data } = useFavorites();
  return useMemo(() => new Set((data ?? []).map((f) => f.entity_id)), [data]);
}

export function useToggleFavorite() {
  const ws = useWorkspaceId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ entityType, entityId, starred }: { entityType: ApiEntityType; entityId: string; starred: boolean }) => {
      if (starred) return http.post('/v1/favorite', { entity_type: entityType, entity_id: entityId });
      return http.delete('/v1/favorite', { query: { entity_type: entityType, entity_id: entityId } });
    },
    // Optimistic: flip the star immediately, roll back on failure.
    onMutate: async ({ entityType, entityId, starred }) => {
      const key = libraryKeys.favorites(ws);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FavoriteRecord[]>(key);
      queryClient.setQueryData<FavoriteRecord[]>(key, (old = []) =>
        starred
          ? [{ _id: `optimistic-${entityId}`, entity_type: entityType, entity_id: entityId, created_at: new Date().toISOString(), entity: { _id: entityId } }, ...old]
          : old.filter((f) => f.entity_id !== entityId),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(libraryKeys.favorites(ws), context.previous);
      toast({ variant: 'destructive', title: 'Could not update favorites', description: (error as Error).message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.favorites(ws) }),
  });
}

// ── Recent ───────────────────────────────────────────────────────────────────

export function useRecent(limit = 20) {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: [...libraryKeys.recent(ws), limit],
    queryFn: async () => (await http.get<RecentRecord[]>('/v1/recent', { query: { limit } })) ?? [],
    staleTime: 30 * 1000,
  });
}

/** Records that the current user opened an entity (fire-and-forget). */
export function useRecordView(entityType: ApiEntityType | null, entityId: string | null | undefined) {
  const ws = useWorkspaceId();
  const queryClient = useQueryClient();
  const record = useCallback(async () => {
    if (!entityType || !entityId) return;
    try {
      await http.post('/v1/recent', { entity_type: entityType, entity_id: entityId });
      queryClient.invalidateQueries({ queryKey: libraryKeys.recent(ws) });
    } catch {
      // Recording history must never interrupt opening a page.
    }
  }, [entityType, entityId, queryClient, ws]);

  useEffect(() => {
    void record();
  }, [record]);
}

// ── Trash ────────────────────────────────────────────────────────────────────

export function useTrash() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: libraryKeys.trash(ws),
    queryFn: async () => (await http.get<TrashRecord[]>('/v1/trash')) ?? [],
    staleTime: 15 * 1000,
  });
}

export function useRestoreFromTrash() {
  const ws = useWorkspaceId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => http.post<{ entity_type: ApiEntityType; entity_id: string }>('/v1/trash/restore', { id }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Restored' });
      invalidateSpaceData(queryClient);
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not restore', description: (error as Error).message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.trash(ws) }),
  });
}

export function usePurgeTrash() {
  const ws = useWorkspaceId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (target: { id: string } | { all: true }) =>
      http.delete('/v1/trash', { query: 'all' in target ? { all: true } : { id: target.id } }),
    onSuccess: (_data, target) => toast({ title: 'all' in target ? 'Trash emptied' : 'Deleted forever' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not delete', description: (error as Error).message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.trash(ws) }),
  });
}

// ── Storage ──────────────────────────────────────────────────────────────────

export function useStorageUsage() {
  const ws = useWorkspaceId();
  return useQuery({
    queryKey: libraryKeys.storage(ws),
    queryFn: () => http.get<StorageUsage>('/v1/workspace/storage'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}
