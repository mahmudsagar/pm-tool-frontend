import { useCallback, useMemo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api/client';
import { shortName, useMemberDirectory } from '@/features/members/useMemberDirectory';
import { withTabActive } from '@/features/peek/peekUrl';
import { followUps, type AutomationToggles } from './automations';
import type { BoardField, FieldMap, RawBoard, StatusOption, Task } from './model';
import { useCreateTask, useDeleteTasks, usePatchBoard, useUpdateTasks, type TaskUpdate } from './queries';
import { BoardCtx, type BoardContextValue } from './boardContext';
import type { DataboardView } from './view';

interface ProviderProps {
  board: RawBoard;
  fields: BoardField[];
  map: FieldMap;
  statuses: StatusOption[];
  tasks: Task[];
  view: DataboardView;
  setView: BoardContextValue['setView'];
  children: ReactNode;
}

export function BoardProvider({ board, fields, map, statuses, tasks, view, setView, children }: ProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { byId, members } = useMemberDirectory();
  // Teams only matter when the board is shared with one (the endpoint 404s when a workspace has none).
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => http.get<unknown[]>('/v1/workspace/team'),
    enabled: (board.shared_teams?.length ?? 0) > 0,
    staleTime: 5 * 60 * 1000,
  });
  const update = useUpdateTasks(board._id);
  const del = useDeleteTasks(board._id);
  const create = useCreateTask(board);
  const patch = usePatchBoard(board._id);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const assignable = useMemo(() => {
    if (board.is_private) return members.filter((m) => m._id === board.user_id);
    const sharedMembers = board.shared_members ?? [];
    const sharedTeams = board.shared_teams ?? [];
    if (!sharedMembers.length && !sharedTeams.length) return members;
    const allowed = new Set([board.user_id, ...sharedMembers]);
    for (const team of (Array.isArray(teams) ? teams : []) as { _id: string; shared_members?: string[] }[]) {
      if (sharedTeams.includes(team._id)) team.shared_members?.forEach((id) => allowed.add(id));
    }
    return members.filter((m) => allowed.has(m._id));
  }, [board, members, teams]);

  const member = useCallback((id: string) => byId.get(id), [byId]);
  const memberName = useCallback((id: string) => shortName(byId.get(id)) || 'Unknown', [byId]);

  const doneValue = useMemo(() => statuses.find((s) => s.category === 'done')?.value ?? 'done', [statuses]);

  const setValues = useCallback(
    (task: Task, values: Record<string, unknown>) => {
      const toggles = (board.automations ?? {}) as AutomationToggles;
      const extra = followUps(task, values, { tasks, fields, map, toggles, doneValue });
      // Merge follow-ups for the same task into its own update.
      const own = { id: task.id, values: { ...values } };
      const others: TaskUpdate[] = [];
      for (const u of extra.updates) {
        if (u.id === task.id) Object.assign(own.values, u.values);
        else others.push(u);
      }
      update.mutate([own, ...others]);
      if (extra.notes.length) toast({ title: extra.notes[0], description: extra.notes.slice(1).join(' ') || undefined });
    },
    [board.automations, tasks, fields, map, doneValue, update, toast],
  );

  const openTask = useCallback(
    (id: string, full = false) => {
      const path = `/document/${id}`;
      if (full) navigate(path);
      else navigate({ pathname: location.pathname, search: withTabActive(location.search, path) });
    },
    [navigate, location.pathname, location.search],
  );

  const labelRegistry = ((board.saved_view as { scrum?: { label_registry?: Record<string, { name: string; color: string }> } } | null)?.scrum
    ?.label_registry ?? {}) as Record<string, { name: string; color: string }>;

  const value: BoardContextValue = {
    board,
    fields,
    map,
    statuses,
    tasks,
    taskById,
    assignable,
    member,
    memberName,
    view,
    setView,
    labelRegistry,
    setValues,
    updateMany: update.mutate,
    remove: del.mutate,
    create: create.mutateAsync,
    patchBoard: patch.mutate,
    openTask,
    readOnly: false,
  };

  return <BoardCtx.Provider value={value}>{children}</BoardCtx.Provider>;
}
