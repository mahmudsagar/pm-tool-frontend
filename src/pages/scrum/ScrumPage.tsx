import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Gauge,
  Layers,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  SquareKanban,
  Target,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/feedback/ErrorState';
import NotFound from '@/BetterRouter/NotFound';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useRecordView } from '@/features/library/queries';
import { BoardProvider } from '@/features/board/BoardContext';
import { useBoard } from '@/features/board/boardContext';
import { useBoardData, useBoardView } from '@/features/board/queries';
import { sprintWindow } from '@/features/scrum/analytics';
import { trimLeadingEmpty, useAnalytics, useSprints, type Sprint } from '@/features/scrum/api';
import { ScrumCtx, type ScrumContextValue, type ScrumTab } from '@/features/scrum/scrumContext';
import { CompleteSprintDialog, SprintFormDialog, StartSprintDialog } from '@/features/scrum/SprintDialogs';
import { NewTaskDialog } from '@/pages/board/NewTaskDialog';

const SprintBoardTab = lazy(() => import('./tabs/SprintBoardTab'));
const BacklogTab = lazy(() => import('./tabs/BacklogTab'));
const BurndownTab = lazy(() => import('./tabs/BurndownTab'));
const CapacityTab = lazy(() => import('./tabs/CapacityTab'));
const ScopeTab = lazy(() => import('./tabs/ScopeTab'));
const CfdTab = lazy(() => import('./tabs/CfdTab'));

const TABS: { value: ScrumTab; label: string; icon: typeof Activity }[] = [
  { value: 'board', label: 'Sprint board', icon: SquareKanban },
  { value: 'backlog', label: 'Backlog & sprints', icon: ListTodo },
  { value: 'burndown', label: 'Burndown & velocity', icon: Activity },
  { value: 'capacity', label: 'Capacity & workload', icon: Users },
  { value: 'scope', label: 'Scope & epics', icon: Target },
  { value: 'cfd', label: 'Flow (CFD)', icon: BarChart3 },
];

function pickDefaultSprint(sprints: Sprint[]) {
  return (
    sprints.find((s) => s.status === 'active') ??
    sprints.find((s) => s.status === 'planned') ??
    [...sprints].reverse().find((s) => s.status === 'closed') ??
    null
  );
}

function ScrumShell({ peek }: { peek: boolean }) {
  const { board, tasks, map } = useBoard();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: sprints = [], isPending: sprintsPending } = useSprints(board._id);
  const [newTask, setNewTask] = useState<{ open: boolean; defaults?: Record<string, unknown> }>({ open: false });
  const [completeOpen, setCompleteOpen] = useState(false);
  const [startFor, setStartFor] = useState<Sprint | null>(null);
  const [editFor, setEditFor] = useState<Sprint | null | 'new'>(null);

  const tab = (TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'board') as ScrumTab;
  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const activeSprint = sprints.find((s) => s.status === 'active') ?? null;
  const sprint = sprints.find((s) => s._id === params.get('sprint')) ?? pickDefaultSprint(sprints);
  const sprintField = map.sprint ?? 'sprint';

  const { sprintTasks, backlog } = useMemo(() => {
    const top = tasks.filter((t) => !t.parentId);
    const known = new Map(sprints.map((s) => [s._id, s] as const));
    const byName = new Map(sprints.map((s) => [s.name, s._id] as const));
    const sprintOf = (id: string) => (known.has(id) ? id : (byName.get(id) ?? ''));
    return {
      sprintTasks: sprint ? top.filter((t) => sprintOf(t.sprintId) === sprint._id) : [],
      backlog: top.filter((t) => !sprintOf(t.sprintId)),
    };
  }, [tasks, sprints, sprint]);

  const team = useMemo(() => {
    const ids = new Set<string>();
    sprintTasks.forEach((t) => t.assignees[0] && ids.add(t.assignees[0]));
    Object.keys(board.capacity?.members ?? {}).forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [sprintTasks, board.capacity]);

  const analyticsParams = useMemo(() => (sprint ? { sprint_id: sprint._id } : null), [sprint]);
  const { data: rawAnalytics, isPending: analyticsLoading } = useAnalytics(board._id, analyticsParams);
  const analytics = useMemo(() => (rawAnalytics ? trimLeadingEmpty(rawAnalytics) : undefined), [rawAnalytics]);
  const sprintWin = sprintWindow(sprint);

  const value: ScrumContextValue = {
    sprints,
    sprint,
    activeSprint,
    setSprintId: (id) => setParam('sprint', id),
    sprintTasks,
    backlog,
    window: sprintWin,
    analytics,
    analyticsLoading: !!analyticsParams && analyticsLoading,
    team,
    tab,
    setTab: (t) => setParam('tab', t === 'board' ? null : t),
    openNewTask: (defaults) => setNewTask({ open: true, defaults }),
    openComplete: () => setCompleteOpen(true),
    openStart: (s) => setStartFor(s),
  };

  // C = new issue, B = burndown (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, [contenteditable="true"], [role="dialog"]')) return;
      if (e.key === 'c') {
        e.preventDefault();
        setNewTask({ open: true, defaults: sprint && sprint.status !== 'closed' ? { [sprintField]: sprint._id } : undefined });
      }
      if (e.key === 'b') setParam('tab', 'burndown');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sprint, sprintField, setParam]);

  const daysLeftLabel = sprintWin && !sprintWin.notStarted ? (sprintWin.ended ? 'Ended' : `${sprintWin.daysLeft}d left`) : null;
  const ActiveTab = { board: SprintBoardTab, backlog: BacklogTab, burndown: BurndownTab, capacity: CapacityTab, scope: ScopeTab, cfd: CfdTab }[tab];

  return (
    <ScrumCtx.Provider value={value}>
      <div className={cn('flex min-h-0 flex-col gap-4', peek ? 'p-4' : 'mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8')}>
        <header className="flex flex-wrap items-center gap-3">
          {!peek && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
              <SquareKanban className="size-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-subtle">
              Scrum board {board.key && <span className="rounded border border-border bg-muted/50 px-1.5 font-mono normal-case">{board.key}</span>}
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{board.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" aria-label="Choose sprint">
                  {sprint ? (
                    <>
                      <span className={cn('size-1.5 rounded-full', sprint.status === 'active' ? 'bg-warning' : sprint.status === 'closed' ? 'bg-success' : 'bg-subtle')} />
                      {sprint.name}
                      {sprint.status === 'active' && daysLeftLabel && <span className="font-mono text-2xs text-muted-foreground">· {daysLeftLabel}</span>}
                    </>
                  ) : sprintsPending ? (
                    'Loading sprints…'
                  ) : (
                    'No sprints yet'
                  )}
                  <ChevronDown className="text-subtle" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Sprints</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sprint?._id} onValueChange={(id) => setParam('sprint', id)}>
                  {sprints.map((s) => (
                    <DropdownMenuRadioItem key={s._id} value={s._id}>
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      <span className="ml-2 text-2xs capitalize text-subtle">{s.status}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setEditFor('new')}>
                  <Plus /> New sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => value.openNewTask(sprint && sprint.status !== 'closed' ? { [sprintField]: sprint._id } : undefined)}>
              <Plus /> Add issue
            </Button>
            {sprint?.status === 'active' && (
              <Button variant="brand" size="sm" onClick={() => setCompleteOpen(true)}>
                <CheckCircle2 /> Complete sprint
              </Button>
            )}
            {sprint?.status === 'planned' && (
              <Button variant="brand" size="sm" disabled={!!activeSprint} title={activeSprint ? `${activeSprint.name} is still active` : undefined} onClick={() => setStartFor(sprint)}>
                <Play /> Start sprint
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Board actions">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {sprint && (
                  <DropdownMenuItem onSelect={() => setEditFor(sprint)}>
                    <Pencil /> Edit {sprint.name}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setEditFor('new')}>
                  <Plus /> New sprint
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate(`/board/${board._id}`)}>
                  <Layers /> Table, timeline & calendar views
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate(`/scrum/${board._id}/classic`)}>
                  <Wrench /> Classic tools (team health, tests, standups)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(`${window.location.origin}/scrum/${board._id}`)}>
                  <Copy /> Copy link
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.open(`/scrum/${board._id}`, '_blank', 'noopener')}>
                  <ExternalLink /> Open in new tab
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <nav role="tablist" aria-label="Scrum studios" className="-mx-1 flex gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted/40 p-0.5 [scrollbar-width:none] sm:mx-0 sm:w-fit">
          {TABS.map(({ value: v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={tab === v}
              onClick={() => value.setTab(v)}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab === v && 'bg-card text-foreground shadow-sm',
              )}
            >
              <Icon className="size-3.5" /> {label}
              {tab === v && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
            </button>
          ))}
        </nav>

        {!sprintsPending && sprints.length === 0 && tab !== 'backlog' ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <Gauge className="mb-3 size-8 text-subtle" />
            <p className="text-sm font-medium">Plan your first sprint</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">Sprints give the board a goal, dates and a commitment, which the burndown, velocity and capacity studios are built on.</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="brand" onClick={() => setEditFor('new')}>
                <Plus /> New sprint
              </Button>
              <Button size="sm" variant="outline" onClick={() => value.setTab('backlog')}>
                Open backlog
              </Button>
            </div>
          </div>
        ) : (
          <Suspense fallback={<Skeleton className="h-[60vh] w-full rounded-xl" />}>
            <ActiveTab />
          </Suspense>
        )}
      </div>

      <NewTaskDialog open={newTask.open} onOpenChange={(o) => setNewTask((p) => ({ ...p, open: o }))} defaults={newTask.defaults} title="New issue" />
      <CompleteSprintDialog boardId={board._id} sprint={sprint?.status === 'active' ? sprint : activeSprint} sprints={sprints} tasks={sprintTasks} open={completeOpen} onOpenChange={setCompleteOpen} />
      <StartSprintDialog
        boardId={board._id}
        sprint={startFor}
        open={!!startFor}
        onOpenChange={(o) => !o && setStartFor(null)}
        taskCount={startFor ? tasks.filter((t) => !t.parentId && t.sprintId === startFor._id).length : 0}
        points={startFor ? tasks.filter((t) => !t.parentId && t.sprintId === startFor._id).reduce((s, t) => s + (t.points ?? 0), 0) : 0}
      />
      <SprintFormDialog boardId={board._id} sprint={editFor === 'new' ? null : editFor} open={editFor !== null} onOpenChange={(o) => !o && setEditFor(null)} nextName={`Sprint ${sprints.length + 1}`} />
    </ScrumCtx.Provider>
  );
}

interface ScrumPageProps {
  id?: string;
  peek?: boolean;
}

export default function ScrumPage({ id: propId, peek = false }: ScrumPageProps) {
  const params = useParams();
  const boardId = propId ?? params.id ?? '';
  const { derived, isPending, error, refetch } = useBoardData(boardId);
  const [view, setView] = useBoardView(derived?.board);
  useRecordView('board', boardId);

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-9 w-full max-w-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[50vh] w-full rounded-xl" />
      </div>
    );
  }
  if (error) {
    if (error instanceof ApiError && error.status === 404) return <NotFound />;
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!derived) return <NotFound />;

  return (
    <BoardProvider board={derived.board} fields={derived.fields} map={derived.map} statuses={derived.statuses} tasks={derived.tasks} view={view} setView={setView}>
      <ScrumShell peek={peek} />
    </BoardProvider>
  );
}
