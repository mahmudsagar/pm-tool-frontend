import { useState, type CSSProperties } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronDown, ChevronRight, CornerDownRight, GripVertical, ListChecks, MessageSquare, MoreHorizontal, Paperclip, Plus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AvatarStack, UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import type { Task } from '@/features/board/model';
import { groupTasks, PRIORITY_LABEL, type TaskGroup } from '@/features/board/view';
import { DateChip, LabelChip, PriorityGlyph, ProgressBar, StatusDot } from '@/features/board/components/chips';
import { PRIORITY_DOT } from '@/features/board/components/tones';
import { TaskMenu } from '@/features/board/components/editors';
import { InlineAdd } from './InlineAdd';
import { reorderUpdates } from './reorder';

const DONE_PREVIEW = 5;

/* --------------------------------------------------------------- card */

function CardBody({ task, compact }: { task: Task; compact?: boolean }) {
  const { member, labelRegistry, taskById } = useBoard();
  const users = task.assignees.map(member).filter(Boolean) as NonNullable<ReturnType<typeof member>>[];
  const parent = task.parentId ? taskById.get(task.parentId) : undefined;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Check className="size-3.5 shrink-0 text-success-foreground" />
        <span className="font-mono text-2xs text-subtle">{task.key}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground line-through">{task.title}</span>
        {task.due && <span className="font-mono text-2xs text-subtle">{task.due.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}</span>}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-2xs font-medium text-muted-foreground">{task.key}</span>
        {task.priority === 'urgent' && <span className="rounded bg-danger/15 px-1 font-mono text-2xs font-semibold text-danger-foreground">P0</span>}
        {task.labels.slice(0, 2).map((l) => (
          <LabelChip key={l} label={l} registry={labelRegistry} />
        ))}
        <span className="ml-auto" />
        <PriorityGlyph priority={task.priority} />
      </div>
      {parent && (
        <p className="mt-1 flex items-center gap-1 truncate text-2xs text-subtle">
          <CornerDownRight className="size-3" /> {parent.title}
        </p>
      )}
      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">{task.title}</p>
      {task.checklist && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-2xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ListChecks className="size-3" /> Checklist
            </span>
            <span className="font-mono">
              {task.checklist.done}/{task.checklist.total}
            </span>
          </div>
          <ProgressBar value={task.checklist.total ? (task.checklist.done / task.checklist.total) * 100 : 0} />
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <DateChip task={task} />
        {task.comments > 0 && (
          <span className="flex items-center gap-0.5 font-mono text-2xs text-muted-foreground" title={`${task.comments} comments`}>
            <MessageSquare className="size-3" /> {task.comments}
          </span>
        )}
        {task.attachments > 0 && (
          <span className="flex items-center gap-0.5 font-mono text-2xs text-muted-foreground" title={`${task.attachments} attachments`}>
            <Paperclip className="size-3" /> {task.attachments}
          </span>
        )}
        <span className="ml-auto" />
        {users.length > 1 ? (
          <AvatarStack users={users} size="xs" max={3} />
        ) : users[0] ? (
          <UserAvatar user={users[0]} size="xs" />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-border text-subtle" title="Unassigned">
            <UserRound className="size-3" />
          </span>
        )}
      </div>
    </>
  );
}

function Card({ task, compact, sortable }: { task: Task; compact?: boolean; sortable: boolean }) {
  const { openTask } = useBoard();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: !sortable, data: { type: 'card' } });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={task.title}
      onClick={(e) => openTask(task.id, e.metaKey || e.ctrlKey)}
      onKeyDown={(e) => e.key === 'Enter' && openTask(task.id)}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        compact && 'px-3 py-2',
        isDragging && 'border-dashed border-brand/50 bg-brand/5 opacity-60 shadow-none',
      )}
    >
      <div className={cn(isDragging && 'invisible')}>
        <CardBody task={task} compact={compact} />
      </div>
      {isDragging && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-2xs text-muted-foreground">
          <GripVertical className="size-4" /> Drop card to update stage
        </div>
      )}
      {!compact && (
        <TaskMenu task={task}>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`More actions for ${task.title}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-1.5 top-1.5 bg-card opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal />
          </Button>
        </TaskMenu>
      )}
    </article>
  );
}

/* ------------------------------------------------------------- column */

function WipEditor({ group }: { group: TaskGroup }) {
  const { view, setView } = useBoard();
  const current = view.kanban.wip[group.id];
  const [draft, setDraft] = useState(current ? String(current) : '');
  const save = (value: number | null) => {
    const wip = { ...view.kanban.wip };
    if (value && value > 0) wip[group.id] = value;
    else delete wip[group.id];
    setView({ kanban: { ...view.kanban, wip } });
  };
  return (
    <Popover onOpenChange={(open) => open && setDraft(current ? String(current) : '')}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Column settings for ${group.label}`}>
          <MoreHorizontal />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(Number(draft) || null);
          }}
          className="space-y-2"
        >
          <label className="text-xs font-medium" htmlFor={`wip-${group.id}`}>
            WIP limit for {group.label}
          </label>
          <p className="text-2xs text-muted-foreground">The column header warns when it holds more cards than this.</p>
          <div className="flex gap-1.5">
            <Input id={`wip-${group.id}`} value={draft} onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))} placeholder="No limit" inputMode="numeric" className="h-7 text-xs" />
            <Button type="submit" size="xs">Save</Button>
          </div>
          {current ? (
            <Button type="button" variant="ghost" size="xs" onClick={() => save(null)}>
              Remove limit
            </Button>
          ) : null}
        </form>
      </PopoverContent>
    </Popover>
  );
}

function Column({ group, lane, sortable }: { group: TaskGroup; lane: string; sortable: boolean }) {
  const { view } = useBoard();
  const droppableId = `col:${lane}:${group.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId, data: { type: 'column', groupId: group.id, lane } });
  const [showAllDone, setShowAllDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const wip = view.kanban.wip[group.id];
  const over = wip !== undefined && group.tasks.length > wip;
  const isDone = group.category === 'done';
  const visible = isDone && !showAllDone ? group.tasks.slice(0, DONE_PREVIEW) : group.tasks;
  const hiddenCount = group.tasks.length - visible.length;

  return (
    <section
      aria-label={group.label}
      className={cn('flex w-[19rem] shrink-0 flex-col rounded-xl border border-border bg-muted/30 transition-colors sm:w-[21rem]', isOver && 'border-brand/40 bg-brand/5')}
    >
      <header className="flex h-11 items-center gap-2 px-3">
        {group.category && <StatusDot category={group.category} />}
        {group.priority && <span className={cn('size-2 rounded-full', PRIORITY_DOT[group.priority])} />}
        <h3 className="truncate text-xs font-semibold uppercase tracking-wide">{group.label}</h3>
        <span
          className={cn(
            'rounded-full border px-1.5 py-0.5 font-mono text-2xs',
            over ? 'border-danger/30 bg-danger/10 text-danger-foreground' : wip ? 'border-brand/25 bg-brand/10 text-brand' : 'border-border bg-background text-muted-foreground',
          )}
          title={wip ? `WIP limit ${wip}` : undefined}
        >
          {wip ? `${group.tasks.length} / ${wip} WIP` : group.tasks.length}
        </span>
        <span className="ml-auto" />
        <Button variant="ghost" size="icon-xs" aria-label={`Add task to ${group.label}`} onClick={() => setAdding(true)}>
          <Plus />
        </Button>
        <WipEditor group={group} />
      </header>
      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
        {adding && <AddCard group={group} onDone={() => setAdding(false)} />}
        <SortableContext id={droppableId} items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visible.map((t) => (
            <Card key={t.id} task={t} compact={isDone} sortable={sortable} />
          ))}
        </SortableContext>
        {group.tasks.length === 0 && !adding && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-6 text-2xs text-subtle">Drop cards here</div>
        )}
        {hiddenCount > 0 && (
          <button type="button" onClick={() => setShowAllDone(true)} className="rounded-md py-1.5 text-2xs text-muted-foreground hover:bg-accent hover:text-foreground">
            + {hiddenCount} more completed {hiddenCount === 1 ? 'task' : 'tasks'}
          </button>
        )}
        {!adding && <InlineAdd label="New issue" values={group.patch} className="mt-auto" />}
      </div>
    </section>
  );
}

function AddCard({ group, onDone }: { group: TaskGroup; onDone: () => void }) {
  const { create } = useBoard();
  const [title, setTitle] = useState('');
  return (
    <div className="rounded-lg border border-brand/40 bg-card p-2 shadow-sm">
      <textarea
        autoFocus
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && onDone()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (title.trim()) void create({ title: title.trim(), values: group.patch }).then(() => setTitle(''));
          }
          if (e.key === 'Escape') onDone();
        }}
        placeholder="What needs doing? Enter to add"
        aria-label={`New task in ${group.label}`}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-subtle"
      />
    </div>
  );
}

/* --------------------------------------------------------------- view */

interface Lane {
  id: string;
  label: string;
  patch: Record<string, unknown>;
  tasks: Task[];
}

export function KanbanView({ tasks }: { tasks: Task[] }) {
  const { view, setView, fields, map, statuses, memberName, taskById, updateMany, setValues, member } = useBoard();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const sortable = view.sort.field === 'manual';
  const groupBy = view.kanban.group_by || 'status';
  const ctx = { fields, map, statuses, memberName };

  const swim = view.kanban.swimlane;
  const lanes: Lane[] =
    swim === 'none'
      ? [{ id: 'all', label: '', patch: {}, tasks }]
      : groupTasks(tasks, swim === 'epic' ? map.epic : swim, ctx).map((g) => ({ id: g.id, label: g.label, patch: g.patch, tasks: g.tasks }));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const locate = (id: string): { groupId: string; lane: string } | null => {
    for (const lane of lanes) {
      for (const g of groupTasks(lane.tasks, groupBy, ctx)) if (g.tasks.some((t) => t.id === id)) return { groupId: g.id, lane: lane.id };
    }
    return null;
  };
  const targetOf = (overId: string, data: Record<string, unknown> | undefined) => {
    if (data?.type === 'column') return { groupId: String(data.groupId), lane: String(data.lane) };
    return locate(overId);
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const moved = taskById.get(String(e.active.id));
    if (!moved || !e.over) return;
    const overId = String(e.over.id);
    const target = targetOf(overId, e.over.data.current as Record<string, unknown>);
    const source = locate(moved.id);
    if (!target || !source) return;
    const lane = lanes.find((l) => l.id === target.lane);
    const group = lane && groupTasks(lane.tasks, groupBy, ctx).find((g) => g.id === target.groupId);
    if (!lane || !group) return;

    const patch = {
      ...(source.groupId !== target.groupId ? group.patch : {}),
      ...(source.lane !== target.lane ? lane.patch : {}),
    };
    if (Object.keys(patch).length) setValues(moved, patch);
    if (!sortable) return;
    const list = group.tasks.filter((t) => t.id !== moved.id);
    let index = list.findIndex((t) => t.id === overId);
    if (index < 0) index = list.length;
    else if (source.groupId === target.groupId && source.lane === target.lane) {
      const oldIndex = group.tasks.findIndex((t) => t.id === moved.id);
      const overIndex = group.tasks.findIndex((t) => t.id === overId);
      if (overIndex > oldIndex) index = overIndex;
    }
    const updates = reorderUpdates(list, moved, index).map((u) => ({ id: u.id, sort_order: u.sort_order }));
    if (updates.length) updateMany(updates);
  };

  const active = activeId ? taskById.get(activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto pb-4">
        {lanes.map((lane) => {
          const groups = groupTasks(lane.tasks, groupBy, ctx);
          const isCollapsed = collapsedLanes.has(lane.id);
          const laneUser = swim === 'assignee' && lane.id.startsWith('a:') && lane.id !== 'a:none' ? member(lane.id.slice(2)) : undefined;
          return (
            <section key={lane.id} aria-label={lane.label || 'Board'}>
              {swim !== 'none' && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedLanes((prev) => {
                      const next = new Set(prev);
                      if (next.has(lane.id)) next.delete(lane.id);
                      else next.add(lane.id);
                      return next;
                    })
                  }
                  className="sticky left-0 mb-2 flex items-center gap-2 rounded-md px-1 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  {laneUser && <UserAvatar user={laneUser} size="xs" />}
                  {swim === 'priority' && lane.id !== 'p:none' && <span className={cn('size-2 rounded-full', PRIORITY_DOT[lane.id.slice(2) as keyof typeof PRIORITY_LABEL])} />}
                  {lane.label}
                  <span className="font-mono text-2xs text-subtle">{lane.tasks.length}</span>
                </button>
              )}
              {!isCollapsed && (
                <div className="flex items-start gap-3">
                  {groups.map((g) => (
                    <Column key={g.id} group={g} lane={lane.id} sortable={sortable} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <DragOverlay>
        {active ? (
          <div className="w-[19rem] rotate-1 rounded-lg border border-brand/40 bg-card p-3 shadow-overlay sm:w-[21rem]">
            <CardBody task={active} />
          </div>
        ) : null}
      </DragOverlay>
      {tasks.length === 0 && (view.filters.length > 0 || view.assignees.length > 0) && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No tasks match.{' '}
          <button type="button" className="text-brand hover:underline" onClick={() => setView({ filters: [], assignees: [] })}>
            Clear filters
          </button>
        </p>
      )}
    </DndContext>
  );
}
