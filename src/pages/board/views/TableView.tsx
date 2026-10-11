import { useState, type CSSProperties } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, Download, GripVertical, MessageSquare, MoreHorizontal, Paperclip, Plus, Trash2, UserRound, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { findStatusOption, priorityValue, type BoardField, type Priority, type Task } from '@/features/board/model';
import { groupTasks, PRIORITY_LABEL, type TaskGroup } from '@/features/board/view';
import { ChecklistChip, DateChip, LabelChip, PriorityPill, ProgressBar, StatusDot, StatusPill, TaskTypeIcon } from '@/features/board/components/chips';
import { PRIORITY_DOT } from '@/features/board/components/tones';
import { AssigneePicker, DuePicker, LabelsEditor, PriorityPicker, StatusPicker, TaskMenu } from '@/features/board/components/editors';
import type { Column } from './columns';
import { InlineAdd } from './InlineAdd';
import { reorderUpdates } from './reorder';

/* ------------------------------------------------------------ columns */

/* -------------------------------------------------------------- cells */

function EditableText({ value, onSave, numeric, placeholder }: { value: string; onSave: (v: string) => void; numeric?: boolean; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
        className={cn('w-full truncate rounded px-1.5 py-1 text-left text-xs hover:bg-accent', numeric && 'font-mono', !value && 'text-subtle')}
      >
        {value || placeholder || '—'}
      </button>
    );
  }
  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };
  return (
    <input
      autoFocus
      value={draft}
      inputMode={numeric ? 'decimal' : undefined}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(numeric ? e.target.value.replace(/[^\d.]/g, '') : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      className={cn('w-full rounded border border-brand/50 bg-background px-1.5 py-1 text-xs outline-none ring-2 ring-brand/20', numeric && 'font-mono')}
    />
  );
}

function FieldCell({ task, field }: { task: Task; field: BoardField }) {
  const { setValues } = useBoard();
  const raw = task.values[field.name];
  if (field.type === 'select' && field.options?.length) {
    const current = field.options.find((o) => o.value === raw || o.label === raw);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" onClick={(e) => e.stopPropagation()} className="w-full truncate rounded px-1.5 py-1 text-left text-xs hover:bg-accent">
            {current?.label ?? <span className="text-subtle">—</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
          {field.options.map((o) => (
            <DropdownMenuItem key={o.value} onSelect={() => setValues(task, { [field.name]: o.value })}>
              {o.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setValues(task, { [field.name]: '' })}>Clear</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (['input', 'text', 'number', 'epic'].includes(field.type)) {
    return <EditableText value={raw === null || raw === undefined ? '' : String(raw)} numeric={field.type === 'number'} onSave={(v) => setValues(task, { [field.name]: v })} />;
  }
  const text = raw === null || raw === undefined || raw === '' ? '—' : typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
  return <span className="block truncate px-1.5 text-xs text-muted-foreground">{text}</span>;
}

function Cell({ col, task }: { col: Column; task: Task }) {
  const { statuses, member, map, setValues, labelRegistry } = useBoard();
  switch (col.id) {
    case 'status': {
      const opt = findStatusOption(statuses, task.status);
      return (
        <StatusPicker task={task}>
          <button type="button" onClick={(e) => e.stopPropagation()} aria-label={`Status: ${opt?.label ?? 'none'}`} className="max-w-full rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <StatusPill label={opt?.label ?? task.status} category={task.statusCategory} />
          </button>
        </StatusPicker>
      );
    }
    case 'priority':
      return (
        <PriorityPicker task={task}>
          <button type="button" onClick={(e) => e.stopPropagation()} aria-label={`Priority: ${task.priority ?? 'none'}`} className="rounded-full px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <PriorityPill priority={task.priority} />
          </button>
        </PriorityPicker>
      );
    case 'assignee': {
      const user = task.assignees[0] ? member(task.assignees[0]) : undefined;
      return (
        <AssigneePicker task={task}>
          <button type="button" onClick={(e) => e.stopPropagation()} className="flex w-full min-w-0 items-center gap-2 rounded px-1 py-1 text-left text-xs hover:bg-accent">
            {user ? (
              <>
                <UserAvatar user={user} size="xs" />
                <span className="truncate">{user.name || user.email}</span>
                {task.assignees.length > 1 && <span className="font-mono text-2xs text-subtle">+{task.assignees.length - 1}</span>}
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-subtle">
                <UserRound className="size-4" /> Unassigned
              </span>
            )}
          </button>
        </AssigneePicker>
      );
    }
    case 'due':
      return (
        <DuePicker task={task}>
          <button type="button" onClick={(e) => e.stopPropagation()} aria-label="Due date" className="rounded-md px-0.5 py-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <DateChip task={task} variant="cell" className={cn(!task.due && 'px-1')} />
          </button>
        </DuePicker>
      );
    case 'labels':
      return (
        <LabelsEditor task={task}>
          <button type="button" onClick={(e) => e.stopPropagation()} aria-label="Edit tags" className="flex w-full min-w-0 flex-wrap items-center gap-1 rounded px-1 py-1 text-left hover:bg-accent">
            {task.labels.length ? task.labels.slice(0, 3).map((l) => <LabelChip key={l} label={l} registry={labelRegistry} />) : <span className="text-xs text-subtle">—</span>}
            {task.labels.length > 3 && <span className="font-mono text-2xs text-subtle">+{task.labels.length - 3}</span>}
          </button>
        </LabelsEditor>
      );
    case 'points':
      return <EditableText numeric value={task.points === null ? '' : String(task.points)} onSave={(v) => map.points && setValues(task, { [map.points]: v ? Number(v) : null })} />;
    case 'estimate':
      return <EditableText value={task.estimate} placeholder="—" onSave={(v) => map.estimate && setValues(task, { [map.estimate]: v })} />;
    case 'progress':
      return task.progress === null ? (
        <span className="px-1.5 text-xs text-subtle">—</span>
      ) : (
        <div className="flex items-center gap-2 pr-2">
          <ProgressBar value={task.progress} tone={task.progress === 100 ? 'success' : 'brand'} className="flex-1" />
          <span className="w-8 text-right font-mono text-2xs text-muted-foreground">{task.progress}%</span>
        </div>
      );
    default:
      return col.field ? <FieldCell task={task} field={col.field} /> : null;
  }
}

/* --------------------------------------------------------------- rows */

interface RowProps {
  task: Task;
  columns: Column[];
  template: string;
  selected: boolean;
  onSelect: (id: string, shift: boolean) => void;
  depth?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  sortable: boolean;
}

function TaskRow({ task, columns, template, selected, onSelect, depth = 0, expanded, onToggleExpand, sortable }: RowProps) {
  const { openTask } = useBoard();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: !sortable || depth > 0 });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, gridTemplateColumns: template };
  const done = task.statusCategory === 'done';
  return (
    <div
      ref={setNodeRef}
      style={style}
      role="row"
      aria-selected={selected}
      onClick={(e) => openTask(task.id, e.metaKey || e.ctrlKey)}
      className={cn(
        'group grid min-h-11 cursor-pointer items-center border-b border-border/70 bg-card text-sm transition-colors hover:bg-accent/40',
        selected && 'bg-brand/5 hover:bg-brand/10',
        isDragging && 'relative z-10 opacity-40',
      )}
    >
      <div role="gridcell" className="flex items-center gap-0.5 pl-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label={`Drag ${task.title}`}
          className={cn('flex size-6 items-center justify-center rounded text-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100', (!sortable || depth > 0) && 'invisible')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <Checkbox checked={selected} onClick={(e) => onSelect(task.id, e.shiftKey)} aria-label={`Select ${task.title}`} />
      </div>
      {columns.map((col) =>
        col.id === 'name' ? (
          <div role="gridcell" key="name" className="flex min-w-0 items-center gap-2 pr-2" style={{ paddingLeft: depth * 24 }}>
            {onToggleExpand ? (
              <button
                type="button"
                aria-label={expanded ? 'Hide subtasks' : 'Show subtasks'}
                aria-expanded={expanded}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="flex size-5 shrink-0 items-center justify-center rounded text-subtle hover:bg-accent hover:text-foreground"
              >
                {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <TaskTypeIcon task={task} />
            <span className="hidden shrink-0 font-mono text-2xs text-subtle xl:inline">{task.key}</span>
            <span className={cn('min-w-0 truncate text-sm text-foreground', done && 'text-muted-foreground line-through')}>{task.title}</span>
            {task.checklist && <ChecklistChip done={task.checklist.done} total={task.checklist.total} className="shrink-0" />}
            {task.comments > 0 && (
              <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-2xs text-muted-foreground" title={`${task.comments} comments`}>
                <MessageSquare className="size-3" /> {task.comments}
              </span>
            )}
            {task.attachments > 0 && (
              <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-2xs text-subtle" title={`${task.attachments} attachments`}>
                <Paperclip className="size-3" /> {task.attachments}
              </span>
            )}
            <TaskMenu task={task}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`More actions for ${task.title}`}
                onClick={(e) => e.stopPropagation()}
                className="ml-auto shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal />
              </Button>
            </TaskMenu>
          </div>
        ) : (
          <div role="gridcell" key={col.id} className={cn('min-w-0 px-1', done && 'opacity-70')}>
            <Cell col={col} task={task} />
          </div>
        ),
      )}
      <div />
    </div>
  );
}

/* ------------------------------------------------------------- groups */

function GroupBody({ group, children }: { group: TaskGroup; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}` });
  return (
    <div ref={setNodeRef} className={cn('min-h-2', isOver && 'bg-brand/5')}>
      {children}
    </div>
  );
}

function GroupHeader({ group, collapsed, onToggle, selectedCount, onSelectAll }: { group: TaskGroup; collapsed: boolean; onToggle: () => void; selectedCount: number; onSelectAll: () => void }) {
  const points = group.tasks.reduce((sum, t) => sum + (t.points ?? 0), 0);
  const done = group.tasks.filter((t) => t.statusCategory === 'done').length;
  return (
    <div className="sticky top-9 z-[5] flex h-10 items-center gap-2 border-b border-border bg-muted/40 px-2 backdrop-blur-sm">
      <button type="button" onClick={onToggle} aria-expanded={!collapsed} aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${group.label}`} className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent">
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {group.tasks.length > 0 && (
        <Checkbox
          checked={selectedCount === 0 ? false : selectedCount === group.tasks.length ? true : 'indeterminate'}
          onClick={onSelectAll}
          aria-label={`Select all in ${group.label}`}
          className="mr-1"
        />
      )}
      {group.category && <StatusDot category={group.category} />}
      {group.priority && <span className={cn('size-2 rounded-full', PRIORITY_DOT[group.priority as Priority])} />}
      <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-foreground">{group.label}</h3>
      <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-2xs text-muted-foreground">
        {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
      </span>
      <span className="ml-auto hidden font-mono text-2xs text-subtle sm:inline">
        {points > 0 && `${points} pts · `}
        {group.tasks.length > 0 ? `${Math.round((done / group.tasks.length) * 100)}% done` : ''}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- bulk bar */

function BulkBar({ ids, onClear }: { ids: string[]; onClear: () => void }) {
  const { statuses, map, fields, assignable, updateMany, remove } = useBoard();
  const apply = (values: Record<string, unknown>) => updateMany(ids.map((id) => ({ id, values })));
  return (
    <div role="toolbar" aria-label="Bulk actions" className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-fit flex-wrap items-center gap-1 rounded-xl border border-border bg-popover px-2 py-1.5 shadow-overlay animate-in fade-in-0 slide-in-from-bottom-2">
      <span className="px-2 text-xs font-medium">{ids.length} selected</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">Status</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          {statuses.map((s) => (
            <DropdownMenuItem key={s.value} onSelect={() => apply({ [map.status]: s.value })}>
              <StatusDot category={s.category} /> {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">Priority</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => (
            <DropdownMenuItem key={p} onSelect={() => apply({ [map.priority]: priorityValue(fields, map, p) })}>
              <span className={cn('size-2 rounded-full', PRIORITY_DOT[p])} /> {PRIORITY_LABEL[p]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">Assign</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <div className="max-h-64 overflow-y-auto">
            {assignable.map((m) => (
              <DropdownMenuItem key={m._id} onSelect={() => apply({ [map.assignee]: m._id })}>
                <UserAvatar user={m} size="xs" /> {m.name || m.email}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => apply({ [map.assignee]: '' })}>
            <UserRound /> Unassigned
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="xs"
        className="text-danger-foreground hover:text-danger-foreground"
        onClick={() => {
          remove(ids);
          onClear();
        }}
      >
        <Trash2 /> Delete
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Clear selection" onClick={onClear}>
        <X />
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- view */

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function TableView({ tasks, columns }: { tasks: Task[]; columns: Column[] }) {
  const ctx = useBoard();
  const { view, setView, map, fields, statuses, memberName, updateMany, taskById, board } = ctx;
  const hidden = new Set(view.hidden_columns);
  const shown = columns.filter((c) => !hidden.has(c.id));
  const template = `4rem ${shown.map((c) => c.width).join(' ')} 2.5rem`;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const sortable = view.sort.field === 'manual';

  // Parents, plus subtasks whose parent is filtered out. Subtasks of shown parents expand inline.
  const visibleIds = new Set(tasks.map((t) => t.id));
  const rows = tasks.filter((t) => !t.parentId || !visibleIds.has(t.parentId));
  const groups = groupTasks(rows, view.group_by, { fields, map, statuses, memberName });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const moved = taskById.get(String(e.active.id));
    if (!moved || !e.over) return;
    const overId = String(e.over.id);
    const target = overId.startsWith('group:') ? groups.find((g) => `group:${g.id}` === overId) : groups.find((g) => g.tasks.some((t) => t.id === overId));
    if (!target) return;
    const from = groups.find((g) => g.tasks.some((t) => t.id === moved.id));
    const list = target.tasks.filter((t) => t.id !== moved.id);
    let index = overId.startsWith('group:') ? list.length : list.findIndex((t) => t.id === overId);
    if (index < 0) index = list.length;
    // Dropping below the original position in the same group lands after the hovered row.
    if (from === target) {
      const oldIndex = target.tasks.findIndex((t) => t.id === moved.id);
      const overIndex = target.tasks.findIndex((t) => t.id === overId);
      if (overIndex > oldIndex) index = overIndex;
    }
    const patch = from !== target ? target.patch : {};
    const updates = reorderUpdates(list, moved, index, patch);
    if (updates.length) {
      if (Object.keys(patch).length) ctx.setValues(moved, patch);
      updateMany(updates.map((u) => (u.id === moved.id ? { id: u.id, sort_order: u.sort_order } : u)));
    }
  };

  const exportCsv = () => {
    const cols = shown.filter((c) => c.id !== 'name');
    const header = ['Key', 'Task', ...cols.map((c) => c.label)];
    const value = (t: Task, c: Column) => {
      switch (c.id) {
        case 'status':
          return findStatusOption(statuses, t.status)?.label ?? t.status;
        case 'priority':
          return t.priority ? PRIORITY_LABEL[t.priority] : '';
        case 'assignee':
          return t.assignees.map(memberName).join('; ');
        case 'due':
          return t.due ? t.due.toLocaleDateString() : '';
        case 'labels':
          return t.labels.join('; ');
        case 'points':
          return t.points ?? '';
        case 'estimate':
          return t.estimate;
        case 'progress':
          return t.progress === null ? '' : `${t.progress}%`;
        default:
          return c.field ? (t.values[c.field.name] as string) ?? '' : '';
      }
    };
    const lines = [header, ...tasks.map((t) => [t.key, t.title, ...cols.map((c) => value(t, c))])].map((r) => r.map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `${board.name || 'board'}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const totalPoints = tasks.reduce((s, t) => s + (t.points ?? 0), 0);
  const doneCount = tasks.filter((t) => t.statusCategory === 'done').length;
  const rate = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const active = activeId ? taskById.get(activeId) : null;
  const collapsed = new Set(view.collapsed);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="min-h-0 flex-1 overflow-auto" role="grid" aria-label="Tasks" aria-rowcount={tasks.length}>
        <div className="min-w-max">
          <div role="row" className="sticky top-0 z-10 grid h-9 items-center border-b border-border bg-card text-2xs font-medium uppercase tracking-wide text-subtle" style={{ gridTemplateColumns: template }}>
            <div className="flex items-center pl-8">
              <Checkbox
                checked={selected.size === 0 ? false : selected.size === tasks.length ? true : 'indeterminate'}
                onClick={() => setSelected(selected.size === tasks.length ? new Set() : new Set(tasks.map((t) => t.id)))}
                aria-label="Select all tasks"
              />
            </div>
            {shown.map((c) => (
              <div key={c.id} role="columnheader" className={cn('truncate px-2', c.id === 'name' && 'pl-9')}>
                {c.label}
              </div>
            ))}
            <div className="flex justify-center">
              <ColumnsAdd columns={columns} />
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.id);
              const groupSelected = group.tasks.filter((t) => selected.has(t.id)).length;
              return (
                <section key={group.id} aria-label={group.label}>
                  {view.group_by && (
                    <GroupHeader
                      group={group}
                      collapsed={isCollapsed}
                      selectedCount={groupSelected}
                      onToggle={() => setView({ collapsed: isCollapsed ? view.collapsed.filter((c) => c !== group.id) : [...view.collapsed, group.id] })}
                      onSelectAll={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          const all = groupSelected === group.tasks.length;
                          group.tasks.forEach((t) => (all ? next.delete(t.id) : next.add(t.id)));
                          return next;
                        })
                      }
                    />
                  )}
                  {!isCollapsed && (
                    <GroupBody group={group}>
                      <SortableContext items={group.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                        {group.tasks.map((task) => {
                          const subs = expanded.has(task.id) ? task.subtaskIds.map((id) => taskById.get(id)).filter((t): t is Task => !!t && visibleIds.has(t.id)) : [];
                          return (
                            <div key={task.id}>
                              <TaskRow
                                task={task}
                                columns={shown}
                                template={template}
                                selected={selected.has(task.id)}
                                onSelect={toggleSelect}
                                sortable={sortable}
                                expanded={expanded.has(task.id)}
                                onToggleExpand={
                                  task.subtaskIds.length
                                    ? () =>
                                        setExpanded((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(task.id)) next.delete(task.id);
                                          else next.add(task.id);
                                          return next;
                                        })
                                    : undefined
                                }
                              />
                              {subs.map((sub) => (
                                <TaskRow key={sub.id} task={sub} columns={shown} template={template} selected={selected.has(sub.id)} onSelect={toggleSelect} depth={1} sortable={false} />
                              ))}
                              {expanded.has(task.id) && (
                                <div className="border-b border-border/70" style={{ paddingLeft: '5.5rem' }}>
                                  <InlineAdd label="Add subtask…" parentId={task.id} className="py-1" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </SortableContext>
                      <div className="border-b border-border/70 pl-14">
                        <InlineAdd label={view.group_by ? `Add task to ${group.label}…` : 'Add task…'} values={group.patch} />
                      </div>
                    </GroupBody>
                  )}
                </section>
              );
            })}
            <DragOverlay>
              {active ? (
                <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-popover px-3 text-sm shadow-overlay">
                  <TaskTypeIcon task={active} /> {active.title}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-muted/30 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-brand" /> Total: <span className="font-mono">{tasks.length} tasks</span>
        </span>
        {map.points && (
          <span className="hidden text-muted-foreground sm:inline">
            Story points: <span className="font-mono text-foreground">{totalPoints} pts</span>
          </span>
        )}
        <span className="flex items-center gap-2 text-muted-foreground">
          Completion: <span className="font-mono font-medium text-brand">{rate}%</span>
          <ProgressBar value={rate} className="w-20" />
        </span>
        <span className="ml-auto hidden font-mono text-2xs text-subtle md:inline">
          Showing {tasks.length} of {ctx.tasks.length} tasks
        </span>
        <Button variant="outline" size="xs" onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
      </footer>

      {selected.size > 0 && <BulkBar ids={Array.from(selected)} onClear={() => setSelected(new Set())} />}
    </div>
  );
}

function ColumnsAdd({ columns }: { columns: Column[] }) {
  const { view, setView } = useBoard();
  const hidden = columns.filter((c) => view.hidden_columns.includes(c.id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label="Show a hidden column">
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {hidden.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">All columns are showing. Add fields from the Columns menu.</p>}
        {hidden.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => setView({ hidden_columns: view.hidden_columns.filter((id) => id !== c.id) })}>
            {c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
