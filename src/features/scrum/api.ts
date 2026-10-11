import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@/lib/api/client';
import { useToast } from '@/components/ui/use-toast';
import type { BoardCapacity, StatusCategory } from '@/features/board/model';

/* ---------------------------------------------------------------- types */

export type SprintStatus = 'planned' | 'active' | 'closed';

export interface Sprint {
  _id: string;
  board_id: string;
  name: string;
  goal?: string;
  start_date?: string | null;
  end_date?: string | null;
  status: SprintStatus;
  committed?: { points: number; issues: number; task_ids: string[]; at: string } | null;
  closed?: { completed_points: number; completed_issues: number; completed_ids: string[]; spillover_ids: string[]; at: string } | null;
  createdAt?: string;
}

type CategoryCounts = Record<StatusCategory, { points: number; issues: number }>;

export interface AnalyticsDay {
  date: string;
  scope_points: number;
  scope_issues: number;
  remaining_points: number;
  remaining_issues: number;
  done_points: number;
  done_issues: number;
  by_category: CategoryCounts;
  completed: { task_id: string; key: string; title: string; points: number }[];
}

export interface ChurnEvent {
  at: string;
  task_id: string;
  key: string;
  title: string;
  delta_points: number;
  kind: 'added' | 'removed' | 'resized';
  actor?: string;
  actor_name?: string;
  reason?: string;
}

export interface VelocityRow {
  sprint_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  status: SprintStatus;
  committed_points: number;
  completed_points: number;
  committed_issues: number;
  completed_issues: number;
}

export interface Analytics {
  range: { from: string; to: string };
  days: string[];
  sprint: Sprint | null;
  statuses: { value: string; label: string; category: StatusCategory }[];
  daily: AnalyticsDay[];
  churn: ChurnEvent[];
  flow: {
    cycle_times: { task_id: string; key: string; days: number }[];
    lead_times: { task_id: string; key: string; days: number }[];
    stage_times: { from: StatusCategory; to: StatusCategory; avg_days: number; count: number }[];
    throughput: { date: string; points: number; issues: number }[];
  };
  velocity: VelocityRow[];
}

/* -------------------------------------------------------------- queries */

export const sprintsKey = (boardId: string) => ['sprints', boardId] as const;

export function useSprints(boardId: string | undefined) {
  return useQuery({
    queryKey: sprintsKey(boardId ?? ''),
    enabled: !!boardId,
    queryFn: () => http.get<Sprint[]>('/v1/board/sprint', { query: { board_id: boardId } }),
  });
}

export function useAnalytics(boardId: string | undefined, params: { sprint_id?: string; from?: string; to?: string } | null) {
  return useQuery({
    queryKey: ['board-analytics', boardId, params],
    enabled: !!boardId && !!params,
    queryFn: () => http.get<Analytics>('/v1/board/analytics', { query: { board_id: boardId, ...params } }),
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------ mutations */

function useInvalidateScrum(boardId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: sprintsKey(boardId) });
    void qc.invalidateQueries({ queryKey: ['board-analytics', boardId] });
    void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'boards' && q.queryKey[1] === boardId });
  };
}

function useScrumMutation<V>(boardId: string, fn: (v: V) => Promise<unknown>, success?: (v: V) => string | undefined) {
  const invalidate = useInvalidateScrum(boardId);
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      const title = success?.(v);
      if (title) toast({ title });
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: error instanceof ApiError && error.status === 409 ? 'Another sprint is already active' : 'Could not update the sprint',
        description: (error as Error).message,
      }),
    onSettled: invalidate,
  });
}

export interface SprintInput {
  name?: string;
  goal?: string;
  start_date?: string | null;
  end_date?: string | null;
}

export function useSprintMutations(boardId: string) {
  return {
    create: useScrumMutation(boardId, (v: SprintInput) => http.post<Sprint>('/v1/board/sprint', { board_id: boardId, ...v }), (v) => `Created ${v.name}`),
    update: useScrumMutation(boardId, (v: SprintInput & { id: string }) => http.put<Sprint>('/v1/board/sprint', v)),
    start: useScrumMutation(boardId, (v: { id: string; start_date?: string; end_date?: string }) => http.post<Sprint>('/v1/board/sprint/start', v), () => 'Sprint started'),
    complete: useScrumMutation(boardId, (v: { id: string; move_to: string }) => http.post<Sprint>('/v1/board/sprint/complete', v), () => 'Sprint completed'),
    remove: useScrumMutation(boardId, (id: string) => http.delete('/v1/board/sprint', { query: { id } }), () => 'Sprint deleted'),
  };
}

/** Saves member capacity, policy and working days on the board. */
export function useSaveCapacity(boardId: string) {
  return useScrumMutation(boardId, (capacity: BoardCapacity) => http.put(`/v1/board?id=${boardId}`, { id: boardId, capacity }), () => 'Capacity saved');
}

/** Reassigns tasks in one request and notifies the new assignee. */
export function useReassign(boardId: string, assigneeField: string) {
  const qc = useQueryClient();
  return useScrumMutation(
    boardId,
    (v: { ids: string[]; to: string }) => {
      const result = http.put('/v1/board/tasks', {
        board_id: boardId,
        notify: true,
        reason: 'Rebalanced workload',
        updates: v.ids.map((id) => ({ id, values: { [assigneeField]: v.to } })),
      });
      void result.then(() => qc.invalidateQueries({ queryKey: ['documents'] }));
      return result;
    },
    (v) => (v.ids.length === 1 ? 'Task reassigned' : `${v.ids.length} tasks reassigned`),
  );
}

/** Analytics with leading days that have no scope yet (before the board had history) dropped. */
export function trimLeadingEmpty(a: Analytics): Analytics {
  const first = a.daily.findIndex((d) => d.scope_issues > 0 || d.done_issues > 0);
  return first <= 0 ? a : { ...a, daily: a.daily.slice(first) };
}
