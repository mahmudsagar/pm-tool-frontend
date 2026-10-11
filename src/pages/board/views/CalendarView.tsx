import { useMemo, useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CalendarClock, ChevronLeft, ChevronRight, ExternalLink, Inbox, Plus, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { dateValues, daysBetween, findStatusOption, isOverdue, toDateKey, type Task } from '@/features/board/model';
import { PRIORITY_LABEL, type DataboardView } from '@/features/board/view';
import { PriorityPill, StatusPill } from '@/features/board/components/chips';
import { PRIORITY_DOT } from '@/features/board/components/tones';

type Mode = DataboardView['calendar']['mode'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 3;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Monday on or before the date. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function isMultiDay(t: Task) {
  return !!t.start && !!t.due && daysBetween(t.start, t.due) >= 1;
}

/* ---------------------------------------------------------- quick view */

function QuickView({ task, children }: { task: Task; children: ReactNode }) {
  const { statuses, member, openTask } = useBoard();
  const user = task.assignees[0] ? member(task.assignees[0]) : undefined;
  const status = findStatusOption(statuses, task.status);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="space-y-3 p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs text-muted-foreground">{task.key}</span>
            <PriorityPill priority={task.priority} className="ml-auto" />
          </div>
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Scheduled</dt>
            <dd className="font-mono">{task.due ? (task.start && !sameDay(task.start, task.due) ? `${fmt(task.start)} – ${fmt(task.due)}` : fmt(task.due)) : '—'}</dd>
            <dt className="text-muted-foreground">Assignee</dt>
            <dd className="flex items-center gap-1.5">
              {user ? (
                <>
                  <UserAvatar user={user} size="xs" /> {user.name || user.email}
                </>
              ) : (
                <span className="text-subtle">Unassigned</span>
              )}
            </dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusPill label={status?.label ?? task.status} category={task.statusCategory} />
            </dd>
            {task.estimate && (
              <>
                <dt className="text-muted-foreground">Estimate</dt>
                <dd className="font-mono">{task.estimate}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-2">
          <Button size="xs" variant="outline" onClick={() => openTask(task.id)}>
            <ExternalLink /> Open details
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ----------------------------------------------------------- draggables */

function TaskChip({ task, className }: { task: Task; className?: string }) {
  const { member } = useBoard();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `chip:${task.id}`, data: { taskId: task.id } });
  const user = task.assignees[0] ? member(task.assignees[0]) : undefined;
  const done = task.statusCategory === 'done';
  return (
    <QuickView task={task}>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        title={task.title}
        className={cn(
          'flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md border border-border bg-card px-1.5 text-left text-2xs shadow-sm transition-colors hover:border-border-strong',
          isOverdue(task) && 'border-danger/30',
          done && 'opacity-60',
          isDragging && 'opacity-30',
          className,
        )}
      >
        <span className={cn('size-1.5 shrink-0 rounded-full', task.priority ? PRIORITY_DOT[task.priority] : 'bg-subtle')} />
        <span className={cn('min-w-0 flex-1 truncate', done && 'line-through')}>{task.title}</span>
        {user && <UserAvatar user={user} size="xs" className="size-4 text-[8px]" />}
      </button>
    </QuickView>
  );
}

function SpanBar({ task, startCol, span, lane, continuesLeft, continuesRight }: { task: Task; startCol: number; span: number; lane: number; continuesLeft: boolean; continuesRight: boolean }) {
  const { member } = useBoard();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `bar:${task.id}`, data: { taskId: task.id } });
  const users = task.assignees.map(member).filter(Boolean);
  const tone = task.priority === 'urgent' ? 'border-danger/30 bg-danger/10 text-danger-foreground' : task.priority === 'high' ? 'border-warning/30 bg-warning/10 text-warning-foreground' : 'border-brand/30 bg-brand/10 text-brand';
  return (
    <QuickView task={task}>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        title={task.title}
        style={{ gridColumn: `${startCol + 1} / span ${span}`, gridRow: lane + 1 }}
        className={cn(
          'pointer-events-auto mx-1 flex h-6 min-w-0 items-center gap-1.5 rounded-md border px-2 text-left text-2xs font-medium',
          tone,
          continuesLeft && 'ml-0 rounded-l-none border-l-0',
          continuesRight && 'mr-0 rounded-r-none border-r-0',
          isDragging && 'opacity-30',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{task.title}</span>
        {span > 2 && task.start && task.due && (
          <span className="hidden shrink-0 font-mono opacity-80 md:inline">
            {task.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {task.due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
        {users[0] && <UserAvatar user={users[0]} size="xs" className="size-4 text-[8px]" />}
      </button>
    </QuickView>
  );
}

/* ---------------------------------------------------------------- cells */

function QuickCreate({ day, children }: { day: Date; children: ReactNode }) {
  const { create, map } = useBoard();
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            void create({ title: title.trim(), values: dateValues(map, day, day) }).then(() => {
              setTitle('');
              setOpen(false);
            });
          }}
        >
          <p className="mb-1.5 text-2xs text-muted-foreground">New task due {day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task name, then Enter" aria-label="New task name" className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20" />
        </form>
      </PopoverContent>
    </Popover>
  );
}

function DayCell({ day, inMonth, tasks, laneCount, tall }: { day: Date; inMonth: boolean; tasks: Task[]; laneCount: number; tall: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${toDateKey(day)}` });
  const today = sameDay(day, new Date());
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const limit = tall ? Infinity : MAX_CHIPS;
  const shown = tasks.slice(0, limit);
  const more = tasks.length - shown.length;
  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      aria-label={day.toDateString()}
      className={cn(
        'group/day flex min-w-0 flex-col border-b border-r border-border p-1.5',
        tall ? 'min-h-[28rem]' : 'min-h-[7.5rem]',
        weekend && 'bg-muted/30',
        !inMonth && 'bg-muted/20 text-subtle',
        today && 'bg-brand/5',
        isOver && 'bg-brand/10 ring-2 ring-inset ring-brand/40',
      )}
    >
      <div className="flex h-6 items-center gap-1.5">
        <span className={cn('flex size-6 items-center justify-center rounded-full font-mono text-2xs', today ? 'bg-brand font-semibold text-brand-foreground' : inMonth ? 'text-foreground' : 'text-subtle')}>
          {String(day.getDate()).padStart(2, '0')}
        </span>
        {today && <span className="text-2xs font-semibold uppercase tracking-wide text-brand">Today</span>}
        <QuickCreate day={day}>
          <button type="button" aria-label={`Add task on ${day.toDateString()}`} className="ml-auto flex size-5 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/day:opacity-100">
            <Plus className="size-3.5" />
          </button>
        </QuickCreate>
      </div>
      {/* Space reserved for multi-day bars drawn over this week row. */}
      <div style={{ height: laneCount * 28 }} aria-hidden />
      <div className="mt-1 space-y-1">
        {shown.map((t) => (
          <TaskChip key={t.id} task={t} />
        ))}
        {more > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="px-1 text-2xs font-medium text-brand hover:underline">
                +{more} more
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <p className="mb-2 text-xs font-medium">{day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <div className="space-y-1">
                {tasks.map((t) => (
                  <TaskChip key={t.id} task={t} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- week */

interface WeekBar {
  task: Task;
  startCol: number;
  span: number;
  lane: number;
  continuesLeft: boolean;
  continuesRight: boolean;
}

function layoutBars(weekStart: Date, tasks: Task[]): { bars: WeekBar[]; lanes: number } {
  const weekEnd = addDays(weekStart, 6);
  const spans = tasks
    .filter((t) => isMultiDay(t) && t.start! <= weekEnd && t.due! >= weekStart)
    .sort((a, b) => a.start!.getTime() - b.start!.getTime() || b.due!.getTime() - a.due!.getTime());
  const laneEnds: number[] = [];
  const bars: WeekBar[] = [];
  for (const task of spans) {
    const s = Math.max(0, daysBetween(weekStart, task.start!));
    const e = Math.min(6, daysBetween(weekStart, task.due!));
    let lane = laneEnds.findIndex((end) => end < s);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = e;
    bars.push({ task, startCol: s, span: e - s + 1, lane, continuesLeft: task.start! < weekStart, continuesRight: task.due! > weekEnd });
  }
  return { bars, lanes: laneEnds.length };
}

function WeekRow({ weekStart, month, tasks, tall }: { weekStart: Date; month: number; tasks: Task[]; tall: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const { bars, lanes } = layoutBars(weekStart, tasks);
  const single = (day: Date) => tasks.filter((t) => !isMultiDay(t) && t.due && sameDay(t.due, day));
  return (
    <div role="row" className="relative grid grid-cols-7">
      {days.map((d) => (
        <DayCell key={d.toISOString()} day={d} inMonth={month < 0 || d.getMonth() === month} tasks={single(d)} laneCount={lanes} tall={tall} />
      ))}
      {bars.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-9 grid grid-cols-7 gap-y-1" style={{ gridAutoRows: '1.5rem' }}>
          {bars.map((b) => (
            <SpanBar key={b.task.id} {...b} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ unscheduled */

function TrayCard({ task }: { task: Task }) {
  const { member } = useBoard();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `tray:${task.id}`, data: { taskId: task.id } });
  const user = task.assignees[0] ? member(task.assignees[0]) : undefined;
  return (
    <QuickView task={task}>
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        {...attributes}
        className={cn('w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-border-strong', isDragging && 'opacity-30')}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs text-muted-foreground">{task.key}</span>
          <PriorityPill priority={task.priority} className="ml-auto" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium">{task.title}</p>
        <div className="mt-2 flex items-center gap-2 text-2xs text-muted-foreground">
          <CalendarClock className="size-3" /> {task.estimate ? `Est: ${task.estimate}` : 'No estimate'}
          <span className="ml-auto flex items-center gap-1.5">
            {user ? (
              <>
                <UserAvatar user={user} size="xs" className="size-4 text-[8px]" /> {user.name?.split(' ')[0]}
              </>
            ) : (
              <UserRound className="size-3.5 text-subtle" />
            )}
          </span>
        </div>
      </button>
    </QuickView>
  );
}

function UnscheduledTray({ tasks, onClose }: { tasks: Task[]; onClose: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'tray' });
  return (
    <aside ref={setNodeRef} aria-label="Unscheduled tasks" className={cn('flex w-full shrink-0 flex-col rounded-xl border border-border bg-card lg:w-80', isOver && 'border-brand/40 bg-brand/5')}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Inbox className="size-4 text-warning-foreground" />
        <h3 className="text-sm font-semibold">Unscheduled</h3>
        <span className="rounded-full border border-border px-1.5 font-mono text-2xs text-muted-foreground">{tasks.length}</span>
        <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label="Hide unscheduled tasks" onClick={onClose}>
          <X />
        </Button>
      </header>
      <p className="px-4 pt-3 text-2xs text-muted-foreground">Drag a task onto a day to schedule it. Drop one here to clear its date.</p>
      <div className="min-h-24 flex-1 space-y-2 overflow-y-auto p-3 lg:max-h-[calc(100dvh-20rem)]">
        {tasks.length === 0 && <p className="py-6 text-center text-xs text-subtle">Everything is scheduled.</p>}
        {tasks.map((t) => (
          <TrayCard key={t.id} task={t} />
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ list */

function AgendaList({ tasks, from, to }: { tasks: Task[]; from: Date; to: Date }) {
  const { openTask, statuses } = useBoard();
  const overdue = tasks.filter((t) => isOverdue(t) && t.due! < from);
  const inRange = tasks.filter((t) => t.due && t.due >= from && t.due <= to).sort((a, b) => a.due!.getTime() - b.due!.getTime());
  const byDay = new Map<string, Task[]>();
  for (const t of inRange) {
    const k = toDateKey(t.due!);
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }
  const Row = ({ t }: { t: Task }) => (
    <button type="button" onClick={() => openTask(t.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent">
      <span className={cn('size-2 shrink-0 rounded-full', t.priority ? PRIORITY_DOT[t.priority] : 'bg-subtle')} />
      <span className="w-20 shrink-0 font-mono text-2xs text-subtle">{t.key}</span>
      <span className={cn('min-w-0 flex-1 truncate text-sm', t.statusCategory === 'done' && 'text-muted-foreground line-through')}>{t.title}</span>
      <StatusPill label={findStatusOption(statuses, t.status)?.label ?? t.status} category={t.statusCategory} className="hidden sm:inline-flex" />
    </button>
  );
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-3">
      {overdue.length > 0 && (
        <section>
          <h3 className="mb-1 px-3 text-2xs font-semibold uppercase tracking-wide text-danger-foreground">Overdue · {overdue.length}</h3>
          {overdue.map((t) => (
            <Row key={t.id} t={t} />
          ))}
        </section>
      )}
      {Array.from(byDay.entries()).map(([k, list]) => {
        const d = new Date(`${k}T00:00:00`);
        return (
          <section key={k}>
            <h3 className={cn('mb-1 px-3 text-2xs font-semibold uppercase tracking-wide text-muted-foreground', sameDay(d, new Date()) && 'text-brand')}>
              {d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            {list.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </section>
        );
      })}
      {inRange.length === 0 && overdue.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nothing scheduled in this period.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ view */

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const { view, setView, map, setValues, taskById } = useBoard();
  const mode = view.calendar.mode;
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const unscheduled = useMemo(() => tasks.filter((t) => !t.due), [tasks]);
  const scheduled = useMemo(() => tasks.filter((t) => t.due), [tasks]);

  const range = useMemo(() => {
    if (mode === 'month' || mode === 'list') {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      return { first, last, gridStart: startOfWeek(first), weeks: Math.ceil((daysBetween(startOfWeek(first), last) + 1) / 7) };
    }
    if (mode === 'week') {
      const s = startOfWeek(cursor);
      return { first: s, last: addDays(s, 6), gridStart: s, weeks: 1 };
    }
    return { first: cursor, last: cursor, gridStart: cursor, weeks: 0 };
  }, [cursor, mode]);

  const step = (dir: -1 | 1) =>
    setCursor((c) => (mode === 'month' || mode === 'list' ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * (mode === 'week' ? 7 : 1))));

  const title =
    mode === 'day'
      ? cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : mode === 'week'
        ? `${range.first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${range.last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const id = e.active.data.current?.taskId as string | undefined;
    const task = id ? taskById.get(id) : undefined;
    if (!task || !e.over) return;
    const target = String(e.over.id);
    if (target === 'tray') {
      if (task.due) setValues(task, dateValues(map, null, null));
      return;
    }
    if (!target.startsWith('day:')) return;
    const day = new Date(`${target.slice(4)}T00:00:00`);
    if (task.due && sameDay(task.due, day)) return;
    // Keep a multi-day task's length, moving its end to the drop day.
    const length = task.start && task.due ? daysBetween(task.start, task.due) : 0;
    setValues(task, dateValues(map, addDays(day, -length), day));
  };

  const showTray = view.calendar.show_unscheduled && mode !== 'list';
  const dragTask = dragId ? taskById.get(dragId) : null;
  const inMonth = scheduled.filter((t) => t.due! >= range.first && t.due! <= range.last);

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragId((e.active.data.current?.taskId as string) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-1 py-0.5">
            <Button variant="ghost" size="icon-xs" aria-label="Previous" onClick={() => step(-1)}>
              <ChevronLeft />
            </Button>
            <h2 className="min-w-[9rem] px-1 text-center text-sm font-semibold" aria-live="polite">
              {title}
            </h2>
            <Button variant="ghost" size="icon-xs" aria-label="Next" onClick={() => step(1)}>
              <ChevronRight />
            </Button>
          </div>
          <Button variant="outline" size="xs" onClick={() => setCursor(startOfDay(new Date()))}>
            Today
          </Button>
          <SegmentedControl
            size="sm"
            aria-label="Calendar mode"
            value={mode}
            onValueChange={(m: Mode) => setView({ calendar: { ...view.calendar, mode: m } })}
            options={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
              { value: 'list', label: 'List' },
            ]}
          />
          <Button
            variant="outline"
            size="xs"
            aria-pressed={view.calendar.show_unscheduled}
            className={cn('font-normal', view.calendar.show_unscheduled && 'border-warning/40')}
            onClick={() => setView({ calendar: { ...view.calendar, show_unscheduled: !view.calendar.show_unscheduled } })}
          >
            <Inbox className="text-warning-foreground" /> Unscheduled
            <span className="rounded-full bg-muted px-1.5 font-mono text-2xs">{unscheduled.length}</span>
          </Button>
          <div className="ml-auto hidden items-center gap-3 text-2xs text-muted-foreground xl:flex">
            {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', PRIORITY_DOT[p])} /> {PRIORITY_LABEL[p]}
              </span>
            ))}
            <span className="border-l border-border pl-3">
              <span className="font-mono text-foreground">{inMonth.length}</span> scheduled ·{' '}
              <span className="font-mono text-danger-foreground">{scheduled.filter((t) => isOverdue(t)).length}</span> overdue
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          {mode === 'list' ? (
            <AgendaList tasks={scheduled} from={range.first} to={range.last} />
          ) : mode === 'day' ? (
            <DayAgenda day={cursor} tasks={scheduled} />
          ) : (
            <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-border bg-card" role="grid" aria-label={title}>
              <div className="min-w-[44rem]">
                <div role="row" className="sticky top-0 z-[2] grid grid-cols-7 border-b border-border bg-card">
                  {WEEKDAYS.map((d, i) => (
                    <div key={d} role="columnheader" className={cn('py-2 text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground', i >= 5 && 'text-subtle')}>
                      {d}
                    </div>
                  ))}
                </div>
                {Array.from({ length: range.weeks }, (_, w) => (
                  <WeekRow key={w} weekStart={addDays(range.gridStart, w * 7)} month={mode === 'month' ? cursor.getMonth() : -1} tasks={scheduled} tall={mode === 'week'} />
                ))}
              </div>
            </div>
          )}
          {showTray && <UnscheduledTray tasks={unscheduled} onClose={() => setView({ calendar: { ...view.calendar, show_unscheduled: false } })} />}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragTask ? (
          <div className="flex h-7 max-w-[14rem] items-center gap-1.5 rounded-md border border-brand/40 bg-card px-2 text-xs shadow-overlay">
            <span className={cn('size-1.5 rounded-full', dragTask.priority ? PRIORITY_DOT[dragTask.priority] : 'bg-subtle')} />
            <span className="truncate">{dragTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DayAgenda({ day, tasks }: { day: Date; tasks: Task[] }) {
  const due = tasks.filter((t) => t.due && (sameDay(t.due, day) || (t.start && t.start <= day && t.due >= day)));
  const { setNodeRef, isOver } = useDroppable({ id: `day:${toDateKey(day)}` });
  return (
    <div ref={setNodeRef} className={cn('min-h-[20rem] min-w-0 flex-1 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-card p-3', isOver && 'border-brand/40 bg-brand/5')}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {due.length} {due.length === 1 ? 'task' : 'tasks'}
        </p>
        <QuickCreate day={day}>
          <Button variant="outline" size="xs">
            <Plus /> Add task
          </Button>
        </QuickCreate>
      </div>
      {due.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nothing due this day.</p>}
      {due.map((t) => (
        <TaskChip key={t.id} task={t} className="h-9 text-xs" />
      ))}
    </div>
  );
}
