import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  AlertOctagon,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Gauge,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  ShieldAlert,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/common/UserAvatar';
import useAuthStore from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import type { StatusCategory, Task } from '@/features/board/model';
import { DateChip, LabelChip, ProgressBar } from '@/features/board/components/chips';
import { TaskMenu } from '@/features/board/components/editors';
import { SearchBox } from '@/features/board/components/toolbar';
import { useScrum } from '@/features/scrum/scrumContext';
import { useSprintMutations } from '@/features/scrum/api';
import { idealLine, memberLoads, round1, sum } from '@/features/scrum/analytics';
import { KpiTile, KpiRow, Panel } from '@/features/scrum/KpiTile';
import { Ring, XYChart } from '@/features/scrum/charts';
import { areaPath, linePath, SERIES } from '@/features/scrum/chartUtils';

/* ------------------------------------------------------------ columns */

type ColumnId = 'todo' | 'in_progress' | 'review' | 'done';
const COLUMNS: { id: ColumnId; label: string; dot: string; categories: StatusCategory[] }[] = [
  { id: 'todo', label: 'To do', dot: 'bg-muted-foreground', categories: ['backlog', 'todo'] },
  { id: 'in_progress', label: 'In progress', dot: 'bg-brand', categories: ['in_progress', 'blocked'] },
  { id: 'review', label: 'Review & QA', dot: 'bg-warning', categories: ['review'] },
  { id: 'done', label: 'Done', dot: 'bg-success', categories: ['done'] },
];
const columnOf = (t: Task): ColumnId => COLUMNS.find((c) => c.categories.includes(t.statusCategory))?.id ?? 'todo';

const PRIORITY_CHIP: Record<string, { label: string; className: string }> = {
  urgent: { label: 'P0 Critical', className: 'bg-danger text-white' },
  high: { label: 'P1 High', className: 'bg-danger/15 text-danger-foreground' },
  medium: { label: 'P2', className: 'bg-muted text-muted-foreground' },
  low: { label: 'P3', className: 'bg-muted text-subtle' },
};

function hoursSince(d: Date | null) {
  if (!d) return null;
  const h = Math.max(0, Math.round((Date.now() - d.getTime()) / 3_600_000));
  return h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`;
}

const pts = (xs: Task[]) => sum(xs.map((t) => t.points ?? 0));

/* --------------------------------------------------------------- goal */

function GoalBanner({ donePts, scopePts }: { donePts: number; scopePts: number }) {
  const { sprint, window } = useScrum();
  const { board } = useBoard();
  const m = useSprintMutations(board._id);
  const [draft, setDraft] = useState(sprint?.goal ?? '');
  if (!sprint) return null;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const progress = scopePts ? Math.round((donePts / scopePts) * 100) : 0;
  return (
    <section aria-label="Sprint goal" className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-brand">
        <Flag className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs">
          <span className="font-semibold uppercase tracking-wide text-brand">{sprint.name} goal</span>
          {window && (
            <span className="text-muted-foreground">
              {fmt(window.start)} — {fmt(window.end)} ({window.days.length} days)
            </span>
          )}
          {window && sprint.status === 'active' && !window.ended && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning-foreground">
              {window.daysLeft} {window.daysLeft === 1 ? 'day' : 'days'} remaining
            </span>
          )}
          {window?.ended && sprint.status === 'active' && <span className="rounded-full bg-danger/10 px-2 py-0.5 font-medium text-danger-foreground">Past end date</span>}
          {sprint.status === 'closed' && <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success-foreground">Closed</span>}
        </p>
        <p className={cn('mt-0.5 line-clamp-2 text-sm font-medium sm:line-clamp-1', !sprint.goal && 'text-subtle')}>{sprint.goal || 'No goal set for this sprint yet.'}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-2xs text-muted-foreground">Goal progress</p>
          <p className="font-mono text-xs font-semibold">{progress}% done</p>
        </div>
        <Ring value={progress} />
        <Popover onOpenChange={(o) => o && setDraft(sprint.goal ?? '')}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Edit sprint goal">
              <Pencil />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-3">
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                m.update.mutate({ id: sprint._id, goal: draft.trim() });
              }}
            >
              <label htmlFor="goal-edit" className="text-xs font-medium">
                Sprint goal
              </label>
              <Textarea id="goal-edit" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button type="submit" size="xs" variant="brand" disabled={m.update.isPending}>
                Save goal
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- KPIs */

function WipLimit({ value }: { value: number | null }) {
  const { board, patchBoard } = useBoard();
  const [draft, setDraft] = useState(value ? String(value) : '');
  const save = (n: number | null) => {
    const sv = (board.saved_view ?? {}) as Record<string, unknown>;
    const scrum = (sv.scrum ?? {}) as Record<string, unknown>;
    patchBoard({ saved_view: { ...sv, scrum: { ...scrum, wip_points_limit: n } } });
  };
  return (
    <Popover onOpenChange={(o) => o && setDraft(value ? String(value) : '')}>
      <PopoverTrigger asChild>
        <button type="button" className="text-brand hover:underline">
          {value ? `Limit: ${value} pts` : 'Set a WIP limit'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(Number(draft) || null);
          }}
        >
          <label className="text-xs font-medium" htmlFor="wip-pts">
            WIP limit (points in progress or review)
          </label>
          <div className="flex gap-1.5">
            <Input id="wip-pts" value={draft} inputMode="numeric" onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))} className="h-7 text-xs" placeholder="No limit" />
            <Button type="submit" size="xs">
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/* ----------------------------------------------------------- burndown */

function MiniBurndown() {
  const { analytics, sprint, window } = useScrum();
  if (!window || !analytics) return <p className="py-16 text-center text-xs text-muted-foreground">{sprint?.status === 'planned' ? 'The burndown starts when the sprint starts.' : 'Loading burndown…'}</p>;
  const days = window.days;
  const daily = new Map(analytics.daily.map((d) => [d.date, d]));
  const actual = analytics.days.map((d) => daily.get(d)?.remaining_points);
  const start = sprint?.committed?.points ?? analytics.daily[0]?.scope_points ?? 0;
  const ideal = idealLine(days, start);
  const lastIdx = actual.reduce<number>((acc, v, i) => (v !== undefined ? i : acc), -1);
  const lastVal = lastIdx >= 0 ? (actual[lastIdx] as number) : start;
  const burned = lastIdx > 0 ? (start - lastVal) / lastIdx : 0;
  const yMax = Math.max(start, ...actual.filter((v): v is number => v !== undefined), 1);
  return (
    <XYChart
      n={days.length}
      yMax={yMax}
      height={200}
      highlightX={window.elapsed >= 0 && window.elapsed < days.length ? window.elapsed : undefined}
      xLabel={(i) => (i === window.elapsed ? `Today` : `D${i + 1}`)}
      xLabelEvery={Math.max(1, Math.ceil(days.length / 8))}
      ariaLabel="Sprint burndown"
      tooltip={(i) => (
        <div className="space-y-1">
          <p className="font-medium">
            Day {i + 1} · {days[i].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Ideal</span> <span className="font-mono">{ideal[i]} pts</span>
          </p>
          {actual[i] !== undefined && (
            <p className="flex justify-between">
              <span className="text-muted-foreground">Remaining</span> <span className="font-mono text-brand">{actual[i]} pts</span>
            </p>
          )}
        </div>
      )}
    >
      {(s) => {
        const pts_ = actual.map((v, i) => (v === undefined ? null : ([s.x(i), s.y(v)] as [number, number]))).filter(Boolean) as [number, number][];
        const proj: [number, number][] =
          lastIdx >= 0 && lastIdx < days.length - 1 && burned > 0
            ? [
                [s.x(lastIdx), s.y(lastVal)],
                [s.x(days.length - 1), s.y(Math.max(0, lastVal - burned * (days.length - 1 - lastIdx)))],
              ]
            : [];
        return (
          <>
            <path d={linePath(ideal.map((v, i) => [s.x(i), s.y(v)]))} fill="none" className="stroke-muted-foreground/60" strokeDasharray="4 4" strokeWidth={1.5} />
            {pts_.length > 1 && <path d={areaPath(pts_, pts_.map(([x]) => [x, s.plotBottom]))} className="fill-brand/10" />}
            <path d={linePath(pts_)} fill="none" className="stroke-brand" strokeWidth={2} />
            {proj.length > 0 && <path d={linePath(proj)} fill="none" className="stroke-brand/60" strokeDasharray="2 4" strokeWidth={1.5} />}
            {lastIdx >= 0 && <circle cx={s.x(lastIdx)} cy={s.y(lastVal)} r={4} className="fill-card stroke-brand" strokeWidth={2} />}
          </>
        );
      }}
    </XYChart>
  );
}

/* --------------------------------------------------------------- cards */

function SprintCard({ task, overlay }: { task: Task; overlay?: boolean }) {
  const { member, labelRegistry, openTask, taskById } = useBoard();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id, disabled: overlay });
  const user = task.assignees[0] ? member(task.assignees[0]) : undefined;
  const done = task.statusCategory === 'done';
  const prio = task.priority ? PRIORITY_CHIP[task.priority] : null;
  const subs = task.subtaskIds.map((id) => taskById.get(id)).filter(Boolean) as Task[];
  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={task.title}
      onClick={(e) => openTask(task.id, e.metaKey || e.ctrlKey)}
      onKeyDown={(e) => e.key === 'Enter' && openTask(task.id)}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        (task.blocked || (task.priority === 'urgent' && !done)) && 'border-l-2 border-l-danger',
        isDragging && 'opacity-40',
        overlay && 'rotate-1 shadow-overlay',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-2xs text-muted-foreground">{task.key}</span>
        {done ? (
          <CheckCircle2 className="size-3.5 text-success-foreground" />
        ) : task.blocked ? (
          <span className="rounded bg-danger px-1 font-mono text-[10px] font-semibold uppercase text-white">Blocked</span>
        ) : (
          prio && <span className={cn('rounded px-1 font-mono text-[10px] font-semibold uppercase', prio.className)}>{prio.label}</span>
        )}
        <span className="ml-auto flex size-5 items-center justify-center rounded-full border border-border font-mono text-[10px] text-muted-foreground" title="Story points">
          {task.points ?? '–'}
        </span>
      </div>
      <p className={cn('mt-1.5 line-clamp-2 text-sm font-medium leading-snug', done && 'text-muted-foreground line-through')}>{task.title}</p>
      {task.blocked && task.blockedReason && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-danger/10 px-2 py-1.5 text-2xs text-danger-foreground">
          <AlertOctagon className="mt-px size-3 shrink-0" /> {task.blockedReason}
        </p>
      )}
      {!done && (task.labels.length > 0 || subs.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {task.labels.slice(0, 2).map((l) => (
            <LabelChip key={l} label={l} registry={labelRegistry} />
          ))}
          {subs.length > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground">
              <ListChecks className="size-3" /> {subs.filter((x) => x.statusCategory === 'done').length}/{subs.length} subtasks
            </span>
          )}
        </div>
      )}
      {!done && task.checklist && subs.length === 0 && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-2xs text-muted-foreground">
            <span>Checklist</span>
            <span className="font-mono">
              {task.checklist.done}/{task.checklist.total}
            </span>
          </div>
          <ProgressBar value={(task.checklist.done / task.checklist.total) * 100} />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2 text-2xs text-muted-foreground">
        {done ? (
          <span>{task.completedAt ? `Closed ${task.completedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Done'}</span>
        ) : task.blocked ? (
          <span className="font-medium text-danger-foreground">{task.blockedAt ? `Blocked ${hoursSince(task.blockedAt)}` : 'Blocked'}</span>
        ) : task.due ? (
          <DateChip task={task} />
        ) : task.startedAt ? (
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> In progress {hoursSince(task.startedAt)}
          </span>
        ) : null}
        {task.comments > 0 && (
          <span className="flex items-center gap-0.5 font-mono">
            <MessageSquare className="size-3" /> {task.comments}
          </span>
        )}
        <span className="ml-auto" />
        {user ? (
          <UserAvatar user={user} size="xs" />
        ) : (
          <span className="flex items-center gap-1 text-subtle">
            Unassigned <UserRound className="size-3.5" />
          </span>
        )}
      </div>
      {!overlay && (
        <TaskMenu task={task}>
          <button
            type="button"
            aria-label={`More actions for ${task.title}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-8 top-2 hidden rounded p-0.5 text-subtle hover:bg-accent hover:text-foreground group-hover:block"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </TaskMenu>
      )}
    </article>
  );
}

function Cell({ laneId, column, tasks, onAdd }: { laneId: string; column: ColumnId; tasks: Task[]; onAdd?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${laneId}::${column}` });
  return (
    <div ref={setNodeRef} className={cn('flex min-h-20 min-w-0 flex-col gap-2 rounded-lg p-1 transition-colors', isOver && 'bg-brand/10 ring-1 ring-brand/40')}>
      {tasks.map((t) => (
        <SprintCard key={t.id} task={t} />
      ))}
      {tasks.length === 0 && column === 'todo' && onAdd && (
        <button type="button" onClick={onAdd} className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-4 text-2xs text-subtle hover:text-foreground">
          <Plus className="size-3" /> Add issue
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- tab */

type Grouping = 'epic' | 'assignee' | 'priority' | 'none';

export default function SprintBoardTab() {
  const { sprintTasks, sprint, analytics, window, team, openNewTask, setTab } = useScrum();
  const { board, map, statuses, setValues, member, memberName, taskById } = useBoard();
  const me = useAuthStore((s) => s.user?._id);
  const [group, setGroup] = useState<Grouping>(map.epic ? 'epic' : 'assignee');
  const [onlyMine, setOnlyMine] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const sprintField = map.sprint ?? 'sprint';
  const wipLimit = ((board.saved_view as { scrum?: { wip_points_limit?: number | null } } | null)?.scrum?.wip_points_limit ?? null) || null;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sprintTasks
      .filter((t) => (!onlyMine || t.assignees.includes(me ?? '')) && (!urgentOnly || t.priority === 'urgent') && (!blockedOnly || t.blocked) && (!q || t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q)))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [sprintTasks, onlyMine, urgentOnly, blockedOnly, search, me]);

  const lanes = useMemo(() => {
    if (group === 'none') return [{ id: 'all', label: 'All issues', patch: {}, tasks: visible, color: 0 }];
    const keyOf = (t: Task) => (group === 'epic' ? t.epic : group === 'assignee' ? (t.assignees[0] ?? '') : (t.priority ?? ''));
    const ids = Array.from(new Set(visible.map(keyOf)));
    const label = (k: string) =>
      group === 'epic' ? (k ? `Epic: ${k}` : 'No epic') : group === 'assignee' ? (k ? memberName(k) : 'Unassigned') : k ? { urgent: 'Urgent / P0', high: 'High / P1', medium: 'Medium / P2', low: 'Low / P3' }[k] ?? k : 'No priority';
    const field = group === 'epic' ? map.epic : group === 'assignee' ? map.assignee : map.priority;
    return ids
      .sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1) || label(a).localeCompare(label(b)))
      .map((k, i) => ({ id: `lane:${k}`, label: label(k), patch: field ? { [field]: k } : {}, tasks: visible.filter((t) => keyOf(t) === k), color: i }));
  }, [visible, group, map, memberName]);

  // KPIs
  const scopePts = pts(sprintTasks);
  const donePts = pts(sprintTasks.filter((t) => t.statusCategory === 'done'));
  const wipPts = pts(sprintTasks.filter((t) => ['in_progress', 'review'].includes(t.statusCategory)));
  const blockers = sprintTasks.filter((t) => t.blocked && t.statusCategory !== 'done');
  const committed = sprint?.committed?.points ?? scopePts;
  const loads = useMemo(() => (window ? memberLoads(team, sprintTasks, window.days, board.capacity) : []), [team, sprintTasks, window, board.capacity]);
  const capPts = sum(loads.map((l) => l.capacityPts ?? 0));
  const capHours = sum(loads.filter((l) => l.capacityPts).map((l) => l.capacityHours));
  const commitHours = sum(loads.filter((l) => l.capacityPts).map((l) => l.committedHours));
  const ideal = window ? idealLine(window.days, committed) : [];
  const todayIdeal = window && window.elapsed >= 0 ? ideal[Math.min(window.elapsed, ideal.length - 1)] : committed;
  const remaining = scopePts - donePts;
  const buffer = round1(todayIdeal - remaining);
  const health = !window || window.notStarted ? 'Not started' : buffer >= 0 ? 'On track' : buffer > -0.15 * committed ? 'At risk' : 'Behind';
  const scopeCreep = scopePts - committed;
  const velocities = (analytics?.velocity ?? []).filter((v) => v.status === 'closed').map((v) => v.completed_points);
  const avgVelocity = velocities.length ? round1(sum(velocities.slice(-3)) / Math.min(3, velocities.length)) : null;

  const columnTotals = COLUMNS.map((c) => {
    const list = sprintTasks.filter((t) => columnOf(t) === c.id);
    return { ...c, count: list.length, points: pts(list) };
  });

  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const task = taskById.get(String(e.active.id));
    if (!task || !e.over) return;
    const [laneId, column] = String(e.over.id).split('::') as [string, ColumnId];
    const lane = lanes.find((l) => l.id === laneId);
    const values: Record<string, unknown> = {};
    if (column !== columnOf(task)) {
      // Dropping into "To do" means todo (not backlog); "In progress" means in progress (not blocked).
      const cats = COLUMNS.find((c) => c.id === column)!.categories;
      const target = statuses.find((s) => s.category === column) ?? statuses.find((s) => cats.includes(s.category));
      if (target) values[map.status] = target.value;
    }
    if (lane && !lane.tasks.some((t) => t.id === task.id)) Object.assign(values, lane.patch);
    if (Object.keys(values).length) setValues(task, values);
  };

  const dragTask = dragId ? taskById.get(dragId) : null;

  return (
    <div className="space-y-4 pb-12">
      <GoalBanner donePts={donePts} scopePts={scopePts} />

      <KpiRow>
        <KpiTile label="Velocity & scope" icon={Gauge} value={donePts} unit={`/ ${scopePts} pts`} delta={{ text: `${scopePts ? Math.round((donePts / scopePts) * 100) : 0}%`, tone: 'neutral' }}>
          <ProgressBar value={scopePts ? (donePts / scopePts) * 100 : 0} />
        </KpiTile>
        <KpiTile label="Sprint health" icon={TrendingUp} value={health} tone={health === 'On track' ? 'good' : health === 'At risk' ? 'warn' : health === 'Behind' ? 'bad' : 'default'} className="[&_span.text-3xl]:text-xl">
          <p className="flex justify-between">
            <span>Forecast buffer vs ideal</span>
            <span className={cn('font-mono', buffer >= 0 ? 'text-success-foreground' : 'text-danger-foreground')}>
              {buffer >= 0 ? '+' : ''}
              {buffer} pts
            </span>
          </p>
        </KpiTile>
        <KpiTile label="WIP health" icon={ArrowLeftRight} value={wipPts} unit="pts in flight" tone={wipLimit && wipPts > wipLimit ? 'bad' : 'default'}>
          <p className="flex justify-between">
            <WipLimit value={wipLimit} />
            {wipLimit ? <span className="font-mono">{Math.round((wipPts / wipLimit) * 100)}% saturated</span> : null}
          </p>
        </KpiTile>
        <KpiTile label="Blockers" icon={ShieldAlert} value={blockers.length} unit={blockers.length === 1 ? 'blocked issue' : 'blocked issues'} tone={blockers.length ? 'bad' : 'good'}>
          {blockers[0] ? (
            <button type="button" className="truncate text-left text-danger-foreground hover:underline" onClick={() => setBlockedOnly(true)}>
              {blockers[0].key} · {blockers[0].blockedReason || blockers[0].title}
            </button>
          ) : (
            <p>Nothing is blocked.</p>
          )}
        </KpiTile>
        <KpiTile label="Team capacity" icon={Users} value={capPts ? `${round1(commitHours)}h` : '—'} unit={capPts ? `/ ${round1(capHours)}h committed` : undefined}>
          {capPts ? (
            <p className="flex justify-between">
              <span>Allocation</span> <span className="font-mono">{Math.round((sum(loads.map((l) => (l.capacityPts ? l.assignedPts : 0))) / capPts) * 100)}%</span>
            </p>
          ) : (
            <button type="button" className="text-brand hover:underline" onClick={() => setTab('capacity')}>
              Set team capacity
            </button>
          )}
        </KpiTile>
      </KpiRow>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Group:
          <select value={group} onChange={(e) => setGroup(e.target.value as Grouping)} className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground" aria-label="Group swimlanes">
            {map.epic && <option value="epic">Epic swimlanes</option>}
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
            <option value="none">No swimlanes</option>
          </select>
        </label>
        {[
          { on: onlyMine, set: setOnlyMine, label: 'Only my issues', icon: UserRound },
          { on: urgentOnly, set: setUrgentOnly, label: 'Urgent / P0', icon: Flag },
          { on: blockedOnly, set: setBlockedOnly, label: 'Blocked', icon: AlertOctagon },
        ].map(({ on, set, label, icon: Icon }) => (
          <Button key={label} variant="outline" size="xs" aria-pressed={on} onClick={() => set(!on)} className={cn('font-normal', on && 'border-brand/50 bg-brand/10 text-foreground', label === 'Blocked' && 'text-danger-foreground')}>
            <Icon /> {label}
          </Button>
        ))}
        <SearchBox value={search} onChange={setSearch} placeholder="Filter issues…" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title={`${sprint?.name ?? 'Sprint'} burndown`}
          subtitle={window && window.elapsed >= 0 && !window.ended ? `Day ${window.elapsed + 1} of ${window.days.length}` : undefined}
          actions={
            <Button variant="ghost" size="xs" onClick={() => setTab('burndown')}>
              Full report <ChevronRight />
            </Button>
          }
        >
          <MiniBurndown />
        </Panel>
        <Panel title="Team workload" subtitle={`${team.length} ${team.length === 1 ? 'person' : 'people'}`}>
          <div className="space-y-3">
            {loads.length === 0 && <p className="text-xs text-muted-foreground">Assign issues to see each person&apos;s load.</p>}
            {loads.map((l) => {
              const u = member(l.userId);
              const pct = l.load !== null ? Math.round(l.load * 100) : null;
              return (
                <div key={l.userId}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <UserAvatar user={u} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{u?.name || u?.email || 'Unknown'}</span>
                    <span className={cn('font-mono text-2xs', l.status === 'warning' || l.status === 'over' ? 'text-warning-foreground' : 'text-muted-foreground')}>
                      {l.assignedPts}
                      {l.capacityPts ? ` / ${l.capacityPts} pts (${pct}%)` : ' pts'}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', l.status === 'warning' || l.status === 'over' ? 'bg-warning' : 'bg-brand')} style={{ width: `${Math.min(100, pct ?? (l.assignedPts / Math.max(1, ...loads.map((x) => x.assignedPts))) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <DndContext sensors={sensors} onDragStart={(e) => setDragId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
        <div className="overflow-x-auto">
          <div className="min-w-[56rem] space-y-3">
            <div className="sticky top-0 z-[5] grid grid-cols-4 gap-3">
              {columnTotals.map((c) => (
                <div key={c.id} className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3">
                  <span className={cn('size-2 rounded-full', c.dot)} />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">{c.label}</h3>
                  <span className="ml-auto font-mono text-2xs text-muted-foreground">
                    {c.id === 'in_progress' && wipLimit ? (
                      <span className={cn(wipPts > wipLimit ? 'text-danger-foreground' : 'text-brand')}>
                        {wipPts} / {wipLimit} WIP
                      </span>
                    ) : (
                      `${c.count} issues · ${c.points} pts`
                    )}
                  </span>
                </div>
              ))}
            </div>
            {lanes.map((lane) => {
              const isCollapsed = collapsed.has(lane.id);
              const lanePts = pts(lane.tasks);
              const laneDone = pts(lane.tasks.filter((t) => t.statusCategory === 'done'));
              return (
                <section key={lane.id} aria-label={lane.label} className="rounded-xl border border-border bg-muted/20">
                  {group !== 'none' && (
                    <header className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${lane.label}`}
                        onClick={() =>
                          setCollapsed((p) => {
                            const n = new Set(p);
                            if (n.has(lane.id)) n.delete(lane.id);
                            else n.add(lane.id);
                            return n;
                          })
                        }
                        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                      >
                        {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                      {group === 'assignee' && lane.id !== 'lane:' ? <UserAvatar user={member(lane.id.slice(5))} size="xs" /> : <span className={cn('size-2.5 rounded-sm', SERIES[lane.color % SERIES.length])} />}
                      <h3 className="text-sm font-semibold">{lane.label}</h3>
                      <span className="font-mono text-2xs text-subtle">{lanePts} pts committed</span>
                      <span className="ml-auto flex items-center gap-2 text-2xs text-muted-foreground">
                        Progress
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <span className={cn('block h-full rounded-full', SERIES[lane.color % SERIES.length])} style={{ width: `${lanePts ? (laneDone / lanePts) * 100 : 0}%` }} />
                        </span>
                        <span className="w-8 font-mono">{lanePts ? Math.round((laneDone / lanePts) * 100) : 0}%</span>
                      </span>
                      <Button variant="ghost" size="icon-xs" aria-label={`Add issue to ${lane.label}`} onClick={() => openNewTask({ ...lane.patch, ...(sprint ? { [sprintField]: sprint._id } : {}) })}>
                        <Plus />
                      </Button>
                    </header>
                  )}
                  {!isCollapsed && (
                    <div className="grid grid-cols-4 gap-3 px-2 pb-2">
                      {COLUMNS.map((c) => (
                        <Cell
                          key={c.id}
                          laneId={lane.id}
                          column={c.id}
                          tasks={lane.tasks.filter((t) => columnOf(t) === c.id)}
                          onAdd={() => openNewTask({ ...lane.patch, ...(sprint ? { [sprintField]: sprint._id } : {}) })}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
            {lanes.length === 0 && <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">{sprintTasks.length ? 'No issues match these filters.' : 'No issues in this sprint yet. Plan some from the Backlog tab or press C.'}</p>}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>{dragTask ? <div className="w-72"><SprintCard task={dragTask} overlay /></div> : null}</DragOverlay>
      </DndContext>

      <footer className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card/95 px-3 py-2 text-2xs text-muted-foreground backdrop-blur">
        {sprint && (
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className={cn('size-1.5 rounded-full', sprint.status === 'active' ? 'bg-warning' : 'bg-subtle')} /> {sprint.name} {sprint.status}
          </span>
        )}
        {avgVelocity !== null && <span>Avg velocity: <span className="font-mono text-foreground">{avgVelocity} pts/sprint</span></span>}
        <span>Burnup: <span className="font-mono text-foreground">{scopePts ? Math.round((donePts / scopePts) * 100) : 0}%</span></span>
        <span>
          Scope change: <span className={cn('font-mono', scopeCreep > 0 ? 'text-warning-foreground' : 'text-foreground')}>{scopeCreep > 0 ? '+' : ''}{scopeCreep} pts</span>
        </span>
        <span className="ml-auto hidden items-center gap-3 sm:flex">
          <span><kbd className="rounded border border-border px-1 font-mono">C</kbd> New issue</span>
          <span><kbd className="rounded border border-border px-1 font-mono">B</kbd> Burndown</span>
        </span>
      </footer>
    </div>
  );
}
