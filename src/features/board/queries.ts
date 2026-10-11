import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import { getCurrentUserId } from '@/lib/currentUser';
import { invalidateSpaceData } from '@/features/spaces/queries';
import { normalizeEntityAccess } from '@/utils/entityAccessUtils';
import { normalizeTasks, resolveFieldMap, statusOptions, type BoardField, type RawBoard, type RawTask } from './model';
import { readView, type DataboardView } from './view';

/**
 * ['boards', id, …] so the legacy hooks' predicate invalidations still reach this cache, with a
 * distinct last part: the legacy `useBoard` caches an array of boards under ['boards', id, {…}].
 */
export const boardKey = (id: string) => ['boards', id, 'databoard'] as const;
const isBoardQuery = (id: string) => (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === 'boards' && query.queryKey[1] === id;

export function useBoardData(boardId: string | undefined) {
  const query = useQuery({
    queryKey: boardKey(boardId ?? ''),
    enabled: !!boardId,
    queryFn: async () => {
      const data = await http.get<RawBoard[] | RawBoard>('/v1/board', { query: { id: boardId } });
      const board = Array.isArray(data) ? data[0] : data;
      return normalizeEntityAccess(board) as RawBoard;
    },
  });

  const derived = useMemo(() => {
    const board = query.data;
    if (!board) return null;
    const fields = (board.custom_meta?.fields ?? []) as BoardField[];
    const map = resolveFieldMap(fields);
    const tasks = normalizeTasks(board, map);
    return { board, fields, map, tasks, statuses: statusOptions(fields, map, tasks) };
  }, [query.data]);

  return { ...query, derived };
}

/* --------------------------------------------------------- cache edits */

type DocPatch = { values?: Record<string, unknown>; sort_order?: number };

function patchDocs(docs: RawTask[], patches: Map<string, DocPatch>): RawTask[] {
  const apply = (doc: RawTask): RawTask => {
    const p = patches.get(doc._id);
    const next = p
      ? {
          ...doc,
          ...(p.sort_order !== undefined ? { sort_order: p.sort_order } : {}),
          custom_meta: p.values
            ? {
                ...(doc.custom_meta ?? {}),
                values: Object.fromEntries(
                  Object.entries({ ...(doc.custom_meta?.values ?? {}), ...p.values }).filter(([, v]) => v !== null),
                ),
              }
            : doc.custom_meta,
        }
      : doc;
    return next.subtasks ? { ...next, subtasks: next.subtasks.map(apply) } : next;
  };
  return docs.map(apply);
}

function editBoardCache(qc: QueryClient, boardId: string, edit: (board: RawBoard) => RawBoard) {
  qc.setQueriesData({ predicate: isBoardQuery(boardId) }, (old: unknown) => {
    if (!old) return old;
    if (Array.isArray(old)) return old.map((b) => edit(b as RawBoard));
    return edit(old as RawBoard);
  });
}

function lockedOrMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 423) {
    return { title: 'Some tasks are locked', description: 'Locked tasks can only be changed by the person who locked them or an admin.' };
  }
  return { title: 'Could not save', description: (error as Error).message };
}

/* --------------------------------------------------------- task edits */

export interface TaskUpdate {
  id: string;
  values?: Record<string, unknown>;
  sort_order?: number;
}

/** Field edits, reorders and moves; merged server-side so parallel edits don't clobber each other. */
export function useUpdateTasks(boardId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (updates: TaskUpdate[]) => http.put('/v1/board/tasks', { board_id: boardId, updates }),
    onMutate: async (updates) => {
      await qc.cancelQueries({ predicate: isBoardQuery(boardId) });
      const snapshot = qc.getQueriesData({ predicate: isBoardQuery(boardId) });
      const patches = new Map(updates.map((u) => [u.id, { values: u.values, sort_order: u.sort_order }]));
      editBoardCache(qc, boardId, (b) => ({ ...b, documents: patchDocs(b.documents ?? [], patches) }));
      return { snapshot };
    },
    onError: (error, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast({ variant: 'destructive', ...lockedOrMessage(error) });
    },
    onSettled: () => {
      void qc.invalidateQueries({ predicate: isBoardQuery(boardId) });
      // The task's own page shows these values too.
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteTasks(boardId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (ids: string[]) => http.delete('/v1/board/tasks', { query: { board_id: boardId, ids: ids.join(',') } }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ predicate: isBoardQuery(boardId) });
      const snapshot = qc.getQueriesData({ predicate: isBoardQuery(boardId) });
      const gone = new Set(ids);
      const strip = (docs: RawTask[]): RawTask[] =>
        docs.filter((d) => !gone.has(d._id)).map((d) => (d.subtasks ? { ...d, subtasks: strip(d.subtasks) } : d));
      editBoardCache(qc, boardId, (b) => ({ ...b, documents: strip(b.documents ?? []) }));
      return { snapshot };
    },
    onError: (error, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast({ variant: 'destructive', ...lockedOrMessage(error) });
    },
    onSuccess: (_d, ids) => {
      toast({ title: ids.length === 1 ? 'Task moved to trash' : `${ids.length} tasks moved to trash` });
      void qc.invalidateQueries({ queryKey: ['trash'] });
    },
    onSettled: () => void qc.invalidateQueries({ predicate: isBoardQuery(boardId) }),
  });
}

export interface NewTask {
  title: string;
  values?: Record<string, unknown>;
  parentId?: string;
  description?: string;
}

export function useCreateTask(board: RawBoard | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (task: NewTask) => {
      if (!board) throw new Error('Board is still loading.');
      const userId = getCurrentUserId();
      return http.post<RawTask>('/v1/page/document', {
        user_id: userId,
        title: task.title,
        page_type: 'document',
        entity_type: 'page',
        content: { text: task.description ?? '' },
        summary: task.description ?? '',
        last_updated_by: userId,
        custom_meta: { fields: board.custom_meta?.fields ?? [], values: task.values ?? {} },
        board_id: board._id,
        ...(task.parentId ? { parent_id: task.parentId } : {}),
        shared_members: board.shared_members ?? [],
        shared_teams: board.shared_teams ?? [],
        attachments: [],
      });
    },
    onError: (error) => toast({ variant: 'destructive', title: 'Could not create the task', description: (error as Error).message }),
    onSettled: () => {
      if (board) void qc.invalidateQueries({ predicate: isBoardQuery(board._id) });
    },
  });
}

/* --------------------------------------------------------- board edits */

export function usePatchBoard(boardId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (patch: Partial<Pick<RawBoard, 'name' | 'description' | 'key' | 'custom_meta' | 'saved_view' | 'automations'>>) =>
      http.put(`/v1/board?id=${boardId}`, { id: boardId, ...patch }),
    onMutate: async (patch) => {
      await qc.cancelQueries({ predicate: isBoardQuery(boardId) });
      const snapshot = qc.getQueriesData({ predicate: isBoardQuery(boardId) });
      editBoardCache(qc, boardId, (b) => ({ ...b, ...patch }));
      return { snapshot };
    },
    onError: (error, _v, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
      toast({ variant: 'destructive', title: 'Could not update the board', description: (error as Error).message });
    },
    onSuccess: (_d, patch) => {
      if (patch.name !== undefined) invalidateSpaceData(qc);
      if (patch.key !== undefined) void qc.invalidateQueries({ predicate: isBoardQuery(boardId) });
    },
  });
}

/** Per-person bits of the view (active tab, collapsed groups), kept in this browser only. */
type LocalView = Pick<DataboardView, 'view' | 'collapsed'>;
const LOCAL_KEYS: (keyof LocalView)[] = ['view', 'collapsed'];
const localKey = (id: string) => `board-view:${id}`;

function readLocal(id: string | undefined): Partial<LocalView> {
  if (!id) return {};
  try {
    return JSON.parse(localStorage.getItem(localKey(id)) || '{}') as Partial<LocalView>;
  } catch {
    return {};
  }
}

function writeLocal(id: string, view: DataboardView) {
  try {
    localStorage.setItem(localKey(id), JSON.stringify({ view: view.view, collapsed: view.collapsed }));
  } catch {
    // Not critical.
  }
}

/**
 * The board's view settings. Grouping, sorting, filters, columns and WIP limits are shared
 * (`saved_view.databoard`, saved shortly after a change); the active tab and collapsed groups are per person.
 * Other `saved_view` keys (scrum settings, legacy sorts) are kept as they are.
 */
export function useBoardView(board: RawBoard | undefined) {
  const patch = usePatchBoard(board?._id ?? '');
  const [view, setView] = useState<DataboardView>(() => ({ ...readView(board?.saved_view), ...readLocal(board?._id) }));
  const hydrated = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef({ board, mutate: patch.mutate });
  latest.current = { board, mutate: patch.mutate };

  useEffect(() => {
    if (!board || hydrated.current === board._id) return;
    hydrated.current = board._id;
    setView({ ...readView(board.saved_view), ...readLocal(board._id) });
  }, [board]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const update = useCallback((next: Partial<DataboardView> | ((prev: DataboardView) => DataboardView)) => {
    setView((prev) => {
      const value = typeof next === 'function' ? next(prev) : { ...prev, ...next };
      const { board: b, mutate } = latest.current;
      if (!b) return value;
      writeLocal(b._id, value);
      const sharedChanged = (Object.keys(value) as (keyof DataboardView)[]).some(
        (k) => !LOCAL_KEYS.includes(k as keyof LocalView) && JSON.stringify(value[k]) !== JSON.stringify(prev[k]),
      );
      if (sharedChanged) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const current = latest.current.board ?? b;
          const shared = Object.fromEntries(Object.entries(value).filter(([k]) => !LOCAL_KEYS.includes(k as keyof LocalView)));
          mutate({ saved_view: { ...(current.saved_view ?? {}), databoard: shared } });
        }, 500);
      }
      return value;
    });
  }, []);

  return [view, update] as const;
}
