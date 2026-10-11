import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CalendarPlus, Check, ChevronDown, ChevronRight, Crosshair, Diamond, FoldVertical, Layers, UnfoldVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { dateValues, daysBetween, type Task } from '@/features/board/model';
import { groupTasks, PRIORITY_LABEL, type DataboardView } from '@/features/board/view';
import { StatusDot } from '@/features/board/components/chips';
import { addDays, chartRange, criticalPath, headerUnits, PX_PER_DAY, startOfDay, type Zoom } from './timelineModel';

const ROW_H = 40;
const TREE_W = 'clamp(9.5rem, 28vw, 24rem)';
type GroupMode = DataboardView['timeline']['group_by'];

const BAR_TONE: Record<Task['statusCategory'], { track: string; fill: string }> = {
  backlog: { track: 'bg-muted border-border', fill: 'bg-subtle/40' },
  todo: { track: 'bg-muted border-border', fill: 'bg-muted-foreground/30' },
  in_progress: { track: 'bg-brand/15 border-brand/30', fill: 'bg-brand/70' },
  review: { track: 'bg-warning/15 border-warning/30', fill: 'bg-warning/70' },
  blocked: { track: 'bg-danger/15 border-danger/30', fill: 'bg-danger/60' },
  done: { track: 'bg-success/15 border-success/30', fill: 'bg-success/60' },
};

interface Row {
  kind: 'group' | 'task';
  id: string;
  depth: number;
  label: string;
  task?: Task;
  children?: Task[];
}

const isMilestone = (t: Task) => /milestone/i.test(t.type);

function rollup(tasks: Task[]) {
  if (!tasks.length) return 0;
  const weight = (t: Task) => t.points ?? 1;
  const total = tasks.reduce((s, t) => s + weight(t), 0);
  return Math.round(tasks.reduce((s, t) => s + (t.progress ?? (t.statusCategory === 'done' ? 100 : 0)) * weight(t), 0) / total);
}

function spanOf(tasks: Task[]) {
  const dated = tasks.filter((t) => t.start && t.due);
  if (!dated.length) return null;
  return { start: new Date(Math.min(...dated.map((t) => t.start!.getTime()))), due: new Date(Math.max(...dated.map((t) => t.due!.getTime()))) };
}

export function TimelineView({ tasks }: { tasks: Task[] }) {
  const { view, setView, map, fields, statuses, memberName, member, setValues, openTask, taskById, board, patchBoard } = useBoard();
  const zoom = view.timeline.zoom as Zoom;
  const groupMode = view.timeline.group_by;
  const ppd = PX_PER_DAY[zoom];
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------- rows */

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (groupMode === 'parent') {
      const visible = new Set(tasks.map((t) => t.id));
      for (const t of tasks) {
        if (t.parentId && visible.has(t.parentId)) continue;
        const kids = t.subtaskIds.map((id) => taskById.get(id)).filter((k): k is Task => !!k && visible.has(k.id));
        if (kids.length) {
          out.push({ kind: 'group', id: t.id, depth: 0, label: t.title, task: t, children: kids });
          if (!collapsed.has(t.id)) kids.forEach((k) => out.push({ kind: 'task', id: k.id, depth: 1, label: k.title, task: k }));
        } else out.push({ kind: 'task', id: t.id, depth: 0, label: t.title, task: t });
      }
      return out;
    }
    if (groupMode === 'none') return tasks.map((t) => ({ kind: 'task' as const, id: t.id, depth: 0, label: t.title, task: t }));
    const by = groupMode === 'epic' ? map.epic : groupMode;
    for (const g of groupTasks(tasks, by, { fields, map, statuses, memberName })) {
      if (!g.tasks.length) continue;
      out.push({ kind: 'group', id: g.id, depth: 0, label: g.label, children: g.tasks });
      if (!collapsed.has(g.id)) g.tasks.forEach((t) => out.push({ kind: 'task', id: t.id, depth: 1, label: t.title, task: t }));
    }
    return out;
  }, [tasks, groupMode, collapsed, taskById, map, fields, statuses, memberName]);

  const range = useMemo(() => chartRange(tasks, zoom), [tasks, zoom]);
  const header = useMemo(() => headerUnits(range.start, range.days, zoom), [range, zoom]);
  const width = range.days * ppd;
  const x = (d: Date) => daysBetween(range.start, d) * ppd;
  const todayX = x(startOfDay(new Date()));
  const critical = useMemo(() => (view.timeline.critical_path ? criticalPath(tasks) : new Set<string>()), [tasks, view.timeline.critical_path]);
  const rowIndex = new Map(rows.map((r, i) => [r.id, i]));

  const scrollToToday = () => scrollRef.current?.scrollTo({ left: Math.max(0, todayX - 240), behavior: 'smooth' });
  useEffect(() => {
    scrollRef.current?.scrollTo({ left: Math.max(0, todayX - 240) });
    // Only on mount and zoom change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  /* ------------------------------------------------------ drag & link */

  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'start' | 'end'; originX: number; delta: number } | null>(null);
  const [link, setLink] = useState<{ fromId: string; x0: number; y0: number; x1: number; y1: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = chartRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onBarDown = (e: ReactPointerEvent, task: Task, mode: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.altKey && mode === 'move') {
      const p = local(e);
      setLink({ fromId: task.id, x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      return;
    }
    setDrag({ id: task.id, mode, originX: e.clientX, delta: 0 });
  };
  const onBarMove = (e: ReactPointerEvent) => {
    if (link) {
      const p = local(e);
      setLink({ ...link, x1: p.x, y1: p.y });
    } else if (drag) setDrag({ ...drag, delta: Math.round((e.clientX - drag.originX) / ppd) });
  };
  const onBarUp = (e: ReactPointerEvent, task: Task) => {
    if (link) {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-bar-id]');
      const targetId = el?.getAttribute('data-bar-id');
      setLink(null);
      const target = targetId ? taskById.get(targetId) : undefined;
      if (target && target.id !== link.fromId && !target.dependsOn.includes(link.fromId)) {
        const field = map.dependsOn ?? 'depends_on';
        if (!fields.some((f) => f.name === field)) {
          patchBoard({ custom_meta: { ...(board.custom_meta ?? {}), fields: [...fields, { name: field, label: 'Dependent on', type: 'text' }] } });
        }
        setValues(target, { [field]: [...target.dependsOn, link.fromId].join(',') });
      }
      return;
    }
    if (!drag) return;
    const { delta, mode } = drag;
    setDrag(null);
    if (delta === 0) {
      if (mode === 'move') openTask(task.id, e.metaKey || e.ctrlKey);
      return;
    }
    const start = task.start ?? task.due!;
    const due = task.due ?? task.start!;
    let s = start;
    let d = due;
    if (mode === 'move') {
      s = addDays(start, delta);
      d = addDays(due, delta);
    } else if (mode === 'start') s = addDays(start, Math.min(delta, daysBetween(start, due)));
    else d = addDays(due, Math.max(delta, -daysBetween(start, due)));
    setValues(task, dateValues(map, s, d));
  };

  const preview = (t: Task) => {
    if (!t.start || !t.due) return { start: t.start, due: t.due };
    if (!drag || drag.id !== t.id) return { start: t.start, due: t.due };
    const len = daysBetween(t.start, t.due);
    if (drag.mode === 'move') return { start: addDays(t.start, drag.delta), due: addDays(t.due, drag.delta) };
    if (drag.mode === 'start') return { start: addDays(t.start, Math.min(drag.delta, len)), due: t.due };
    return { start: t.start, due: addDays(t.due, Math.max(drag.delta, -len)) };
  };

  /** Double-click an undated row to schedule it from that day. */
  const scheduleAt = (e: React.MouseEvent, task: Task) => {
    if (task.due) return;
    const day = addDays(range.start, Math.floor(local(e).x / ppd));
    setValues(task, dateValues(map, day, addDays(day, zoom === 'days' ? 1 : 4)));
  };

  /* ----------------------------------------------------- dependencies */

  const arrows = useMemo(() => {
    const out: { from: string; to: string; d: string; critical: boolean }[] = [];
    for (const r of rows) {
      const t = r.task;
      if (!t || !t.start) continue;
      for (const depId of t.dependsOn) {
        const dep = taskById.get(depId);
        const fromRow = rowIndex.get(depId);
        const toRow = rowIndex.get(t.id);
        if (!dep?.due || fromRow === undefined || toRow === undefined) continue;
        const pd = preview(dep);
        const pt = preview(t);
        const x1 = x(addDays(pd.due!, 1));
        const y1 = fromRow * ROW_H + ROW_H / 2;
        const x2 = x(pt.start!);
        const y2 = toRow * ROW_H + ROW_H / 2;
        const bend = Math.max(12, Math.min(40, Math.abs(x2 - x1) / 2));
        out.push({
          from: depId,
          to: t.id,
          d: x2 > x1 + 16 ? `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}` : `M${x1},${y1} h12 V${(y1 + y2) / 2} H${x2 - 12} V${y2} h12`,
          critical: critical.has(depId) && critical.has(t.id),
        });
      }
    }
    return out;
    // preview depends on drag; recomputed while dragging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, taskById, rowIndex, range, ppd, drag, critical]);

  /* ------------------------------------------------------------ stats */

  const datedCount = tasks.filter((t) => t.due).length;
  const totalPoints = tasks.reduce((s, t) => s + (t.points ?? 0), 0);
  const atRisk = tasks.filter((t) => isMilestone(t) && t.due && t.statusCategory !== 'done' && daysBetween(new Date(), t.due) <= 7).length;
  const groupOptions: { value: GroupMode; label: string }[] = [
    { value: 'parent', label: 'By parent task' },
    { value: 'status', label: 'By status' },
    { value: 'assignee', label: 'By assignee' },
    ...(map.epic ? [{ value: 'epic' as GroupMode, label: 'By epic' }] : []),
    { value: 'none', label: 'Flat list' },
  ];
  const groupIds = rows.filter((r) => r.kind === 'group').map((r) => r.id);
  const allCollapsed = groupIds.length > 0 && groupIds.every((id) => collapsed.has(id));
  const rangeLabel = `${range.start.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} — ${addDays(range.start, range.days - 1).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          size="sm"
          aria-label="Zoom"
          value={zoom}
          onValueChange={(z: Zoom) => setView({ timeline: { ...view.timeline, zoom: z } })}
          options={[
            { value: 'days', label: 'Days' },
            { value: 'weeks', label: 'Weeks' },
            { value: 'months', label: 'Months' },
            { value: 'quarters', label: 'Quarters' },
          ]}
        />
        <Button variant="outline" size="xs" onClick={scrollToToday}>
          <Crosshair /> Today
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="font-normal">
              <Layers className="text-muted-foreground" /> <span className="text-muted-foreground">Group:</span>
              <span className="font-medium text-brand">{groupOptions.find((o) => o.value === groupMode)?.label.replace('By ', '').replace(/^./, (c) => c.toUpperCase()) ?? 'Parent'}</span>
              <ChevronDown className="text-subtle" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Group rows</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={groupMode} onValueChange={(v) => setView({ timeline: { ...view.timeline, group_by: v as GroupMode } })}>
              {groupOptions.map((o) => (
                <DropdownMenuRadioItem key={o.value} value={o.value}>
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {atRisk > 0 && (
          <span className="flex items-center gap-1.5 text-2xs font-medium text-warning-foreground">
            <span className="size-1.5 rounded-full bg-warning" /> {atRisk} {atRisk === 1 ? 'milestone' : 'milestones'} due within a week
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide">Roadmap</h3>
          <span className="font-mono text-2xs text-subtle">{rangeLabel}</span>
          <div className="ml-auto hidden items-center gap-3 text-2xs text-muted-foreground md:flex">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand/70" /> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-warning/70" /> Review
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-success/60" /> Done
            </span>
            <span className="flex items-center gap-1.5">
              <Diamond className="size-3 fill-warning text-warning" /> Milestone
            </span>
          </div>
          {groupIds.length > 0 && (
            <Button variant="ghost" size="xs" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groupIds))}>
              {allCollapsed ? <UnfoldVertical /> : <FoldVertical />} {allCollapsed ? 'Expand tree' : 'Collapse tree'}
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto" role="treegrid" aria-label="Timeline">
          <div className="grid min-w-max" style={{ gridTemplateColumns: `${TREE_W} ${width}px` }}>
            {/* Header */}
            <div className="sticky left-0 top-0 z-30 flex h-14 items-end justify-between border-b border-r border-border bg-card px-4 pb-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Work items</span>
              <span className="font-mono text-2xs text-subtle">{tasks.length} items</span>
            </div>
            <div className="sticky top-0 z-20 h-14 border-b border-border bg-card">
              <div className="relative h-6 border-b border-border/60">
                {header.top.map((u) => (
                  <div key={u.label + u.left} className="absolute top-0 flex h-6 items-center border-l border-border/60 px-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ left: u.left, width: u.width }}>
                    <span className="truncate">{u.label}</span>
                  </div>
                ))}
              </div>
              <div className="relative h-8">
                <span className="absolute bottom-0 z-[1] -translate-x-1/2 rounded-t bg-brand px-1 font-mono text-[10px] font-semibold leading-4 text-brand-foreground" style={{ left: todayX }}>
                  TODAY
                </span>
                {header.bottom.map((u) => (
                  <div key={u.left} className={cn('absolute top-0 flex h-8 flex-col justify-center border-l border-border/40 px-1.5 leading-tight', u.today && 'bg-brand/10')} style={{ left: u.left, width: u.width }}>
                    <span className={cn('truncate font-mono text-2xs text-foreground', u.today && 'font-semibold text-brand')}>{u.label}</span>
                    {u.sub && u.width > 26 && <span className="truncate font-mono text-[10px] text-subtle">{u.sub}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Tree */}
            <div className="sticky left-0 z-10 border-r border-border bg-card" role="rowgroup">
              {rows.map((r) => {
                const t = r.task;
                const user = t?.assignees[0] ? member(t.assignees[0]) : undefined;
                const progress = r.kind === 'group' ? rollup(r.children ?? []) : null;
                const open = !collapsed.has(r.id);
                return (
                  <div
                    key={r.id}
                    role="row"
                    aria-level={r.depth + 1}
                    aria-expanded={r.kind === 'group' ? open : undefined}
                    className={cn('flex items-center gap-2 border-b border-border/60 pr-3 text-sm', r.kind === 'group' ? 'bg-muted/40 font-medium' : 'hover:bg-accent/40')}
                    style={{ height: ROW_H, paddingLeft: 8 + r.depth * 20 }}
                  >
                    {r.kind === 'group' ? (
                      <button
                        type="button"
                        aria-label={open ? `Collapse ${r.label}` : `Expand ${r.label}`}
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          })
                        }
                        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
                      >
                        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                    ) : t && isMilestone(t) ? (
                      <Diamond className="size-3.5 shrink-0 fill-warning/30 text-warning-foreground" />
                    ) : (
                      <StatusDot category={t?.statusCategory} className="ml-1.5 mr-1" />
                    )}
                    <button
                      type="button"
                      disabled={!t}
                      onClick={() => t && openTask(t.id)}
                      className={cn('min-w-0 flex-1 truncate text-left', t && isMilestone(t) && 'font-medium text-warning-foreground', t?.statusCategory === 'done' && 'text-muted-foreground line-through', t && 'hover:underline')}
                    >
                      {r.label}
                    </button>
                    {progress !== null && <span className="rounded-full border border-border bg-background px-1.5 font-mono text-2xs text-muted-foreground">{progress}%</span>}
                    {t && isMilestone(t) && t.due && (
                      <span className="rounded border border-warning/30 bg-warning/10 px-1.5 font-mono text-2xs text-warning-foreground">{t.due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    )}
                    {r.kind === 'task' && !t?.due && <span className="font-mono text-2xs text-subtle">No dates</span>}
                    {r.kind === 'task' && user && <UserAvatar user={user} size="xs" />}
                  </div>
                );
              })}
              {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">No tasks match.</p>}
            </div>

            {/* Chart */}
            <div
              ref={chartRef}
              className="relative"
              style={{ height: Math.max(rows.length * ROW_H, 160), backgroundImage: `repeating-linear-gradient(to right, hsl(var(--border) / 0.35) 0 1px, transparent 1px ${zoom === 'days' ? ppd : ppd * 7}px)` }}
            >
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={cn('absolute inset-x-0 border-b border-border/60', r.kind === 'group' && 'bg-muted/30')}
                  style={{ top: i * ROW_H, height: ROW_H }}
                  onDoubleClick={(e) => r.task && r.kind === 'task' && scheduleAt(e, r.task)}
                  title={r.task && !r.task.due && r.kind === 'task' ? 'Double-click to schedule from this day' : undefined}
                />
              ))}

              {/* Today line */}
              <div className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-brand" style={{ left: todayX }}>
              </div>

              {/* Dependency arrows */}
              <svg className="pointer-events-none absolute inset-0 z-[6] overflow-visible" width={width} height={rows.length * ROW_H} aria-hidden>
                <defs>
                  <marker id="tl-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" className="fill-warning" />
                  </marker>
                  <marker id="tl-arrow-crit" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" className="fill-brand" />
                  </marker>
                </defs>
                {arrows.map((a) => (
                  <path
                    key={`${a.from}-${a.to}`}
                    d={a.d}
                    fill="none"
                    strokeWidth={a.critical ? 2 : 1.5}
                    strokeDasharray={a.critical ? undefined : '4 3'}
                    className={a.critical ? 'stroke-brand' : 'stroke-warning/80'}
                    markerEnd={`url(#${a.critical ? 'tl-arrow-crit' : 'tl-arrow'})`}
                  />
                ))}
                {link && <line x1={link.x0} y1={link.y0} x2={link.x1} y2={link.y1} strokeWidth={2} strokeDasharray="4 3" className="stroke-brand" />}
              </svg>

              {/* Bars */}
              {rows.map((r, i) => {
                // A parent task's group row shows the parent's own bar; other groups show a rollup.
                if (r.kind === 'group' && !(r.task?.start && r.task?.due)) {
                  const span = spanOf(r.children ?? []);
                  if (!span) return null;
                  const p = rollup(r.children ?? []);
                  const left = x(span.start);
                  const w = Math.max(ppd, x(addDays(span.due, 1)) - left);
                  return (
                    <div key={r.id} className="pointer-events-none absolute z-[7] flex items-center gap-2" style={{ top: i * ROW_H + ROW_H / 2 - 4, left, width: w + 160 }}>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted-foreground/20" style={{ width: w }}>
                        <div className="h-full rounded-full bg-muted-foreground/60" style={{ width: `${p}%` }} />
                      </div>
                      <span className="whitespace-nowrap font-mono text-2xs text-muted-foreground">{p}% overall</span>
                    </div>
                  );
                }
                const t = r.task;
                if (!t) return null;
                const { start, due } = preview(t);
                if (!start || !due) return null;
                const left = x(start);
                const w = Math.max(ppd, x(addDays(due, 1)) - left);
                const top = i * ROW_H;
                const assignee = t.assignees[0] ? memberName(t.assignees[0]) : 'Unassigned';
                const tip = (
                  <TooltipContent side="top" className="w-60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium">{t.title}</p>
                      {t.priority && <span className="shrink-0 rounded border border-border px-1 font-mono text-[10px] uppercase">{PRIORITY_LABEL[t.priority]}</span>}
                    </div>
                    <p className="mt-1 text-2xs text-muted-foreground">Lead: {assignee}</p>
                    <div className="mt-1 flex justify-between font-mono text-2xs">
                      <span className="text-muted-foreground">
                        {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      {t.progress !== null && <span className="text-warning-foreground">{t.progress}% done</span>}
                    </div>
                  </TooltipContent>
                );

                if (isMilestone(t)) {
                  return (
                    <Tooltip key={r.id}>
                      <TooltipTrigger asChild>
                        <div
                          data-bar-id={t.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${t.title}, milestone`}
                          onPointerDown={(e) => onBarDown(e, t, 'move')}
                          onPointerMove={onBarMove}
                          onPointerUp={(e) => onBarUp(e, t)}
                          onKeyDown={(e) => e.key === 'Enter' && openTask(t.id)}
                          className="absolute z-[8] flex cursor-grab touch-none select-none items-center gap-2 active:cursor-grabbing"
                          style={{ top: top + ROW_H / 2 - 10, left: x(due) + ppd / 2 - 10 }}
                        >
                          <span className={cn('flex size-5 rotate-45 items-center justify-center rounded-[3px] border-2 border-warning bg-warning/30', t.statusCategory === 'done' && 'bg-warning', critical.has(t.id) && 'ring-2 ring-brand ring-offset-1 ring-offset-card')} />
                          <span className="whitespace-nowrap rounded bg-card/90 px-1 text-2xs font-semibold text-warning-foreground">{t.title}</span>
                        </div>
                      </TooltipTrigger>
                      {tip}
                    </Tooltip>
                  );
                }

                const tone = BAR_TONE[t.statusCategory];
                const progress = t.progress ?? 0;
                return (
                  <Tooltip key={r.id}>
                    <TooltipTrigger asChild>
                      <div
                        data-bar-id={t.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`${t.title}, ${start.toDateString()} to ${due.toDateString()}`}
                        onPointerDown={(e) => onBarDown(e, t, 'move')}
                        onPointerMove={onBarMove}
                        onPointerUp={(e) => onBarUp(e, t)}
                        onKeyDown={(e) => e.key === 'Enter' && openTask(t.id)}
                        className={cn(
                          'group/bar absolute z-[8] flex cursor-grab touch-none select-none items-center overflow-hidden rounded-md border text-2xs font-medium shadow-sm active:cursor-grabbing',
                          tone.track,
                          critical.has(t.id) && 'ring-2 ring-brand/70',
                          drag?.id === t.id && 'shadow-overlay',
                        )}
                        style={{ top: top + 7, left, width: w, height: ROW_H - 14 }}
                      >
                        <div className={cn('absolute inset-y-0 left-0', tone.fill)} style={{ width: `${t.statusCategory === 'done' ? 100 : progress}%` }} />
                        <span className="relative flex min-w-0 flex-1 items-center gap-1 truncate px-2 text-foreground">
                          {t.statusCategory === 'done' && <Check className="size-3 shrink-0" />}
                          <span className="truncate">{t.title}</span>
                        </span>
                        {w > 90 && t.progress !== null && t.statusCategory !== 'done' && <span className="relative pr-2 font-mono text-[10px] text-muted-foreground">{t.progress}%</span>}
                        <span onPointerDown={(e) => onBarDown(e, t, 'start')} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100" aria-hidden>
                          <span className="absolute inset-y-1.5 left-0.5 w-0.5 rounded bg-foreground/40" />
                        </span>
                        <span onPointerDown={(e) => onBarDown(e, t, 'end')} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover/bar:opacity-100" aria-hidden>
                          <span className="absolute inset-y-1.5 right-0.5 w-0.5 rounded bg-foreground/40" />
                        </span>
                      </div>
                    </TooltipTrigger>
                    {tip}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted/30 px-4 py-2 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Kbd>Drag</Kbd> Shift dates
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Kbd>Edges</Kbd> Resize
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Kbd>Alt</Kbd>+<Kbd>Drag</Kbd> Draw dependency
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <CalendarPlus className="size-3" /> Double-click an empty row to schedule
          </span>
          <span className="ml-auto font-mono">
            {datedCount}/{tasks.length} scheduled{totalPoints > 0 && ` · ${totalPoints} pts`}
          </span>
          <button
            type="button"
            aria-pressed={view.timeline.critical_path}
            onClick={() => setView({ timeline: { ...view.timeline, critical_path: !view.timeline.critical_path } })}
            className="flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono hover:bg-accent hover:text-foreground"
          >
            Critical path {view.timeline.critical_path ? 'on' : 'off'}
            <span className={cn('size-1.5 rounded-full', view.timeline.critical_path && critical.size ? 'bg-brand' : 'bg-subtle')} />
          </button>
        </div>
      </div>
    </div>
  );
}
