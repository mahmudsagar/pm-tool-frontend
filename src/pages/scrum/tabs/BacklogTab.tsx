import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ArrowRightLeft, CheckCircle2, ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Pencil, Play, Plus, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';
import useDialog from '@/hooks/useDialog';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import type { Task } from '@/features/board/model';
import { PriorityPill, TaskTypeIcon } from '@/features/board/components/chips';
import { useScrum } from '@/features/scrum/scrumContext';
import { useSprintMutations, type Sprint } from '@/features/scrum/api';
import { round1, sum } from '@/features/scrum/analytics';
import { SprintFormDialog } from '@/features/scrum/SprintDialogs';
import { InlineAdd } from '@/pages/board/views/InlineAdd';

const pts = (xs: Task[]) => sum(xs.map((t) => t.points ?? 0));

function Row({ task, sprints, onMove }: { task: Task; sprints: Sprint[]; onMove: (task: Task, to: string | null) => void }) {
  const { member, openTask } = useBoard();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id });
  const user = task.assignees[0] ? member(task.assignees[0]) : undefined;
  return (
    <div
      ref={setNodeRef}
      role="row"
      onClick={(e) => openTask(task.id, e.metaKey || e.ctrlKey)}
      className={cn('group flex min-h-10 cursor-pointer items-center gap-2 border-b border-border/70 px-2 text-sm last:border-b-0 hover:bg-accent/40', isDragging && 'opacity-40')}
    >
      <button type="button" aria-label={`Drag ${task.title}`} {...listeners} {...attributes} onClick={(e) => e.stopPropagation()} className="flex size-6 shrink-0 items-center justify-center rounded text-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
        <GripVertical className="size-3.5" />
      </button>
      <TaskTypeIcon task={task} />
      <span className="hidden w-16 shrink-0 font-mono text-2xs text-subtle sm:inline">{task.key}</span>
      <span className={cn('min-w-0 flex-1 truncate', task.statusCategory === 'done' && 'text-muted-foreground line-through')}>{task.title}</span>
      {task.epic && <span className="hidden max-w-[9rem] truncate rounded border border-border px-1.5 text-2xs text-muted-foreground md:inline">{task.epic}</span>}
      <PriorityPill priority={task.priority} className="hidden sm:inline-flex" />
      <span className="w-8 text-right font-mono text-2xs text-muted-foreground" title="Story points">
        {task.points ?? '–'}
      </span>
      {user ? <UserAvatar user={user} size="xs" /> : <UserRound className="size-4 text-subtle" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`Move ${task.title}`} onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100">
            <ArrowRightLeft />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {sprints
            .filter((s) => s.status !== 'closed' && s._id !== task.sprintId)
            .map((s) => (
              <DropdownMenuItem key={s._id} onSelect={() => onMove(task, s._id)}>
                {s.name}
              </DropdownMenuItem>
            ))}
          {task.sprintId && (
            <DropdownMenuItem onSelect={() => onMove(task, null)}>Backlog</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Section({
  id,
  title,
  meta,
  tasks,
  sprints,
  onMove,
  actions,
  addValues,
  defaultOpen = true,
  badge,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  tasks: Task[];
  sprints: Sprint[];
  onMove: (task: Task, to: string | null) => void;
  actions?: React.ReactNode;
  addValues?: Record<string, unknown>;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} aria-label={title} className={cn('rounded-xl border border-border bg-card transition-colors', isOver && 'border-brand/50 bg-brand/5')}>
      <header className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button type="button" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${title}`} onClick={() => setOpen(!open)} className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge}
        <span className="font-mono text-2xs text-subtle">
          {tasks.length} issues · {pts(tasks)} pts
        </span>
        {meta}
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </header>
      {open && (
        <div className="border-t border-border">
          {tasks.map((t) => (
            <Row key={t.id} task={t} sprints={sprints} onMove={onMove} />
          ))}
          {tasks.length === 0 && <p className="px-4 py-4 text-center text-2xs text-subtle">Drag issues here.</p>}
          {addValues && (
            <div className="border-t border-border/70 px-2">
              <InlineAdd label="Add issue…" values={addValues} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function BacklogTab() {
  const { sprints, backlog, activeSprint, analytics, openStart, openComplete } = useScrum();
  const { board, tasks, map, updateMany, taskById } = useBoard();
  const m = useSprintMutations(board._id);
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const [editing, setEditing] = useState<Sprint | null | 'new'>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const sprintField = map.sprint ?? 'sprint';
  const top = tasks.filter((t) => !t.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const inSprint = (s: Sprint) => top.filter((t) => t.sprintId === s._id || t.sprintId === s.name);
  const capacity = sum(Object.values(board.capacity?.members ?? {}).map((c) => c.capacity_pts ?? 0));
  const closed = (analytics?.velocity ?? []).filter((v) => v.status === 'closed').map((v) => v.completed_points);
  const avgVelocity = closed.length ? round1(sum(closed.slice(-3)) / Math.min(3, closed.length)) : null;
  const target = capacity || avgVelocity;

  const move = (task: Task, to: string | null) => updateMany([{ id: task.id, values: { [sprintField]: to } }]);
  const onDragEnd = (e: DragEndEvent) => {
    setDragId(null);
    const task = taskById.get(String(e.active.id));
    if (!task || !e.over) return;
    const dest = String(e.over.id);
    const to = dest === 'backlog' ? null : dest.slice('sprint:'.length);
    if ((to ?? '') !== task.sprintId) move(task, to);
  };

  const open = sprints.filter((s) => s.status !== 'closed');
  const done = sprints.filter((s) => s.status === 'closed').reverse();
  const dragTask = dragId ? taskById.get(dragId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Drag issues between the backlog and sprints.{' '}
            {target ? (
              <>
                Plan about <span className="font-mono text-foreground">{target} pts</span> per sprint ({capacity ? 'team capacity' : 'recent velocity'}).
              </>
            ) : null}
          </p>
          <Button size="xs" variant="outline" className="ml-auto" onClick={() => setEditing('new')}>
            <Plus /> New sprint
          </Button>
        </div>

        {open.map((s) => {
          const list = inSprint(s);
          const total = pts(list);
          const over = target ? total > target : false;
          return (
            <Section
              key={s._id}
              id={`sprint:${s._id}`}
              title={s.name}
              tasks={list}
              sprints={sprints}
              onMove={move}
              addValues={{ [sprintField]: s._id }}
              badge={
                <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium capitalize', s.status === 'active' ? 'bg-warning/10 text-warning-foreground' : 'bg-muted text-muted-foreground')}>
                  {s.status}
                </span>
              }
              meta={
                <span className="text-2xs text-muted-foreground">
                  {s.start_date && s.end_date ? `${s.start_date} → ${s.end_date}` : 'No dates'}
                  {target ? <span className={cn('ml-2 font-mono', over && 'text-warning-foreground')}>{total}/{target} pts planned</span> : null}
                </span>
              }
              actions={
                <>
                  {s.status === 'planned' && (
                    <Button size="xs" variant="outline" disabled={!!activeSprint} title={activeSprint ? `${activeSprint.name} is still active` : undefined} onClick={() => openStart(s)}>
                      <Play /> Start
                    </Button>
                  )}
                  {s.status === 'active' && (
                    <Button size="xs" variant="outline" onClick={openComplete}>
                      <CheckCircle2 /> Complete
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-xs" aria-label={`${s.name} actions`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => setEditing(s)}>
                        <Pencil /> Edit sprint
                      </DropdownMenuItem>
                      {s.status !== 'active' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger-foreground focus:text-danger-foreground"
                            onSelect={() =>
                              setTimeout(
                                () =>
                                  confirm({
                                    title: `Delete ${s.name}?`,
                                    description: `Its ${list.length} issues move back to the backlog.`,
                                    confirmLabel: 'Delete sprint',
                                    onConfirm: () => m.remove.mutateAsync(s._id),
                                  }),
                                120,
                              )
                            }
                          >
                            <Trash2 /> Delete sprint
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            />
          );
        })}

        <Section id="backlog" title="Backlog" tasks={backlog} sprints={sprints} onMove={move} addValues={{}} />

        {done.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-3">
            <h3 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Completed sprints</h3>
            <ul className="divide-y divide-border">
              {done.map((s) => (
                <li key={s._id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                  <CheckCircle2 className="size-3.5 text-success-foreground" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">
                    {s.start_date} → {s.end_date}
                  </span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {s.closed?.completed_points ?? 0} / {s.committed?.points ?? 0} pts completed
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragTask ? (
          <div className="flex h-10 max-w-md items-center gap-2 rounded-md border border-brand/40 bg-popover px-3 text-sm shadow-overlay">
            <TaskTypeIcon task={dragTask} /> {dragTask.title}
          </div>
        ) : null}
      </DragOverlay>
      <SprintFormDialog boardId={board._id} sprint={editing === 'new' ? null : editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} nextName={`Sprint ${sprints.length + 1}`} />
    </DndContext>
  );
}
