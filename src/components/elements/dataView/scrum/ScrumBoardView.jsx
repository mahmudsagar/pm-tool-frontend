import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from '@/BetterRouter/Link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Calendar, GripVertical, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DEFAULT_SCRUM_VIEW_BLOCK } from '@/components/elements/dataView/scrum/scrumBoardConstants';

const SWIMLANE_MODES = [
  { value: 'none', label: 'No swimlanes' },
  { value: 'assignee', label: 'By assignee' },
  { value: 'epic', label: 'By epic' },
  { value: 'priority', label: 'By priority' },
];

const FALLBACK_STATUS_COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'review', label: 'In review' },
  { key: 'done', label: 'Done' },
];

const toDateLabel = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString().split('T')[0];
    return null;
  }
  if (typeof value === 'object') {
    return toDateLabel(value.to || value.end || value.date || value.from || value.start || null);
  }
  return null;
};

const resolveDueDate = (item) =>
  toDateLabel(item?.due_date) ||
  toDateLabel(item?.dates?.to) ||
  toDateLabel(item?.dates) ||
  null;

const findStatusFieldName = (fields = []) => {
  const exact = fields.find((f) => f?.name === 'status');
  if (exact) return exact.name;
  const byLabel = fields.find((f) => String(f?.label || '').toLowerCase().includes('status'));
  if (byLabel) return byLabel.name;
  const byName = fields.find((f) => String(f?.name || '').toLowerCase().includes('status'));
  return byName?.name || null;
};

const normalizedText = (value) => String(value || '').trim().toLowerCase();

const isBlockedStatus = (value) => ['blocked', 'stuck'].includes(normalizedText(value));

const parseDodChecklist = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

const dodGatesSatisfied = (task) => {
  const items = parseDodChecklist(task.dod_checklist);
  if (!items.length) return true;
  return items.every((x) => x && x.done);
};

const isDoneColumn = (col) => {
  const t = `${col?.label || ''} ${col?.key || ''}`.toLowerCase();
  return t.includes('done') || t.includes('complete') || t.includes('closed');
};

const priorityDotClass = (p) => {
  const x = normalizedText(p);
  if (['high', 'urgent', 'critical'].includes(x)) return 'bg-orange-500';
  if (x === 'medium') return 'bg-amber-400';
  if (x === 'low') return 'bg-emerald-500';
  return 'bg-muted-foreground/40';
};

const formatLabels = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

function initialsFromLabel(label) {
  if (!label) return '?';
  const parts = String(label).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(label).slice(0, 2).toUpperCase();
}

function ScrumStoryCard({ task, assigneeMap }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 180ms ease',
  };

  const due = resolveDueDate(task);
  const labels = formatLabels(task.labels);
  const dodItems = parseDodChecklist(task.dod_checklist);
  const dodDone = dodItems.length ? dodItems.filter((i) => i?.done).length : 0;
  const blocked =
    Boolean(task.risk_flag) || isBlockedStatus(task.status) || normalizedText(task.type) === 'blocker';

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-md', isDragging && 'opacity-50')}>
      <Link
        to={`/document/${task.id}`}
        target="_sidebar"
        onClick={() => {}}
        className={cn(
          'block w-full rounded-md border bg-background p-2.5 text-left transition-colors duration-150 hover:bg-muted/60',
          task.isSubtask && 'border-dashed bg-muted/20',
          blocked && 'border-red-400/80 bg-red-50/50 dark:bg-red-950/20'
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Drag to move"
            onClick={(e) => e.preventDefault()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {task.task_id && (
                <span className="font-mono text-[10px] text-muted-foreground">{task.task_id}</span>
              )}
              <span className={cn('inline-block h-2 w-2 rounded-full', priorityDotClass(task.priority))} title={task.priority || 'Priority'} />
              {task.story_points != null && String(task.story_points).trim() !== '' && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold tabular-nums">
                  {task.story_points} pt
                </Badge>
              )}
            </div>
            <p
              className={cn(
                'text-sm font-medium leading-snug underline-offset-2 hover:underline line-clamp-3',
                blocked && 'text-red-800 dark:text-red-200'
              )}
            >
              {task.isSubtask ? `↳ ${task.title || 'Untitled subtask'}` : task.title || 'Untitled'}
            </p>
            {task.epic ? (
              <Badge variant="outline" className="text-[10px] font-normal">
                {task.epic}
              </Badge>
            ) : null}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {labels.slice(0, 4).map((lb) => (
                  <span
                    key={lb}
                    className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
                  >
                    {lb}
                  </span>
                ))}
                {labels.length > 4 ? (
                  <span className="text-[10px] text-muted-foreground">+{labels.length - 4}</span>
                ) : null}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {task.assignee ? (
                <span className="flex items-center gap-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {initialsFromLabel(assigneeMap[task.assignee] || task.assignee)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[9rem]">{assigneeMap[task.assignee] || 'Assignee'}</span>
                </span>
              ) : (
                <span>Unassigned</span>
              )}
              {due && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {due}
                </span>
              )}
            </div>
            {dodItems.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                DoD: {dodDone}/{dodItems.length}
              </p>
            )}
            {blocked && (task.risk_reason || isBlockedStatus(task.status)) && (
              <p className="flex items-start gap-1 text-[10px] text-red-600 dark:text-red-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{task.risk_reason || 'Blocked'}</span>
              </p>
            )}
            {task.overdue && !blocked && (
              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                Overdue
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

const DROP_PREFIX = 'scrum-drop:';

function makeDropId(laneKey, columnKey) {
  return `${DROP_PREFIX}${JSON.stringify({ l: laneKey, c: columnKey })}`;
}

function parseDropTargetId(id) {
  const text = String(id || '');
  if (text.startsWith(DROP_PREFIX)) {
    try {
      const { l, c } = JSON.parse(text.slice(DROP_PREFIX.length));
      return { lane: l, column: c };
    } catch {
      return null;
    }
  }
  return null;
}

function DropColumn({ laneKey, columnKey, children, className }) {
  const { setNodeRef, isOver } = useDroppable({ id: makeDropId(laneKey, columnKey) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        'transition-colors duration-150',
        isOver && 'ring-2 ring-primary/40 bg-primary/5'
      )}
    >
      {children}
    </div>
  );
}

function aggregatePoints(tasks) {
  return tasks.reduce((sum, t) => {
    const n = Number(t.story_points);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * Scrum board: swimlanes, WIP hints, story cards, Definition-of-Done gate on Done column.
 */
export default function ScrumBoardView({
  data,
  assigneeOptions = [],
  onCellChange,
  viewState = {},
  patchSavedView,
  swimlaneFieldNames = { assigneeField: 'assignee', priorityField: 'priority', epicField: 'epic' },
}) {
  const { toast } = useToast();
  const scrumCfg = viewState?.scrum || {};

  const tasks = useMemo(
    () =>
      (data?.property_values || [])
        .filter((item) => !item.parent_id)
        .flatMap((parent) => {
          const parentCard = { ...parent, isSubtask: false };
          const subCards = (parent.subtasks || []).map((sub, idx) => ({
            ...sub,
            id: sub.id || `${parent.id}-sub-${idx}`,
            title: sub.title || 'Untitled subtask',
            parentId: parent.id,
            parentTitle: parent.title || 'Untitled task',
            isSubtask: true,
          }));
          return [parentCard, ...subCards];
        }),
    [data?.property_values]
  );

  const assigneeMap = useMemo(() => {
    const map = {};
    (assigneeOptions || []).forEach((opt) => {
      if (!opt) return;
      map[opt.value] = opt.label;
    });
    return map;
  }, [assigneeOptions]);

  const statusFieldName = useMemo(
    () => findStatusFieldName(data?.property_name || []),
    [data?.property_name]
  );
  const statusFieldDef = useMemo(
    () => (data?.property_name || []).find((f) => f?.name === statusFieldName),
    [data?.property_name, statusFieldName]
  );
  const statusOptions = useMemo(() => {
    const options = statusFieldDef?.props?.optionsData || [];
    if (!Array.isArray(options) || !options.length) return FALLBACK_STATUS_COLUMNS;
    return options.map((opt) => ({
      key: String(opt.value),
      label: opt.label || String(opt.value),
    }));
  }, [statusFieldDef]);

  const normalizeStatus = useCallback(
    (rawStatus) => {
      const text = String(rawStatus ?? '').trim();
      const lowered = text.toLowerCase();
      if (!text) return statusOptions[0]?.key || 'backlog';

      const byValue = statusOptions.find((opt) => String(opt.key).toLowerCase() === lowered);
      if (byValue) return byValue.key;

      const byLabel = statusOptions.find((opt) => String(opt.label || '').toLowerCase() === lowered);
      if (byLabel) return byLabel.key;

      if (lowered.includes('done') || lowered.includes('complete')) {
        return (
          statusOptions.find((opt) => String(opt.label || opt.key).toLowerCase().includes('done'))?.key ||
          'done'
        );
      }
      if (lowered.includes('review')) {
        return (
          statusOptions.find((opt) => String(opt.label || opt.key).toLowerCase().includes('review'))
            ?.key || 'review'
        );
      }
      if (lowered.includes('progress') || lowered.includes('doing')) {
        return (
          statusOptions.find((opt) => String(opt.label || opt.key).toLowerCase().includes('progress'))
            ?.key || 'in_progress'
        );
      }
      return (
        statusOptions.find((opt) => String(opt.label || opt.key).toLowerCase().includes('backlog'))
          ?.key ||
        statusOptions[0]?.key ||
        'backlog'
      );
    },
    [statusOptions]
  );

  const swimlaneMode = scrumCfg.swimlane === 'none' ? null : scrumCfg.swimlane || null;

  const [optimisticColumns, setOptimisticColumns] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    setOptimisticColumns({});
  }, [data?.property_values, swimlaneMode]);

  const fieldName = statusFieldName || 'status';

  const getTaskColumnKey = useCallback(
    (task) => {
      const overridden = optimisticColumns[task.id];
      if (overridden !== undefined) return overridden;
      const statusValue = statusFieldName ? task?.[statusFieldName] : task?.status;
      return normalizeStatus(statusValue);
    },
    [optimisticColumns, normalizeStatus, statusFieldName]
  );

  const getSwimlaneKey = useCallback(
    (task) => {
      if (!swimlaneMode || swimlaneMode === 'none') return '__all__';
      if (swimlaneMode === 'assignee') return task.assignee ? String(task.assignee) : '__unset__';
      if (swimlaneMode === 'epic') {
        const e = task.epic;
        return e ? String(e) : '__unset__';
      }
      if (swimlaneMode === 'priority') return task.priority ? String(task.priority) : '__unset__';
      return '__all__';
    },
    [swimlaneMode]
  );

  const swimlaneLabels = useMemo(() => {
    if (!swimlaneMode) return { __all__: '' };
    /** @type {Record<string, string>} */
    const labels = {};
    if (swimlaneMode === 'assignee') {
      (assigneeOptions || []).forEach((o) => {
        labels[String(o.value)] = o.label;
      });
      labels.__unset__ = 'Unassigned';
      return labels;
    }
    tasks.forEach((t) => {
      const k = getSwimlaneKey(t);
      if (k === '__unset__') labels.__unset__ = 'None';
      else if (!labels[k]) labels[k] = k === '__all__' ? '' : String(k);
    });
    return labels;
  }, [assigneeOptions, getSwimlaneKey, swimlaneMode, tasks]);

  const laneKeys = useMemo(() => {
    if (!swimlaneMode) return ['__all__'];
    const keys = new Set();
    tasks.forEach((t) => keys.add(getSwimlaneKey(t)));
    const arr = [...keys];
    arr.sort((a, b) => {
      if (a === '__unset__') return 1;
      if (b === '__unset__') return -1;
      return String(a).localeCompare(String(b));
    });
    return arr.length ? arr : ['__unset__'];
  }, [getSwimlaneKey, swimlaneMode, tasks]);

  const groupedByLaneAndColumn = useMemo(() => {
    /** @type {Record<string, Record<string, any[]>>} */
    const out = {};
    const ensure = (lane, col) => {
      if (!out[lane]) out[lane] = {};
      if (!out[lane][col]) out[lane][col] = [];
    };
    tasks.forEach((task) => {
      const lane = swimlaneMode ? getSwimlaneKey(task) : '__all__';
      const col = getTaskColumnKey(task);
      ensure(lane, col);
      out[lane][col].push(task);
    });
    statusOptions.forEach((s) => {
      laneKeys.forEach((lane) => {
        ensure(lane, s.key);
      });
    });
    return out;
  }, [getSwimlaneKey, getTaskColumnKey, laneKeys, statusOptions, swimlaneMode, tasks]);

  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);
  const activeTask = activeTaskId ? taskById[activeTaskId] : null;

  const wipLimits = scrumCfg.wip_limits || {};

  const metrics = useMemo(() => {
    const top = tasks.filter((t) => !t.isSubtask);
    const blocked = top.filter(
      (t) => Boolean(t.risk_flag) || isBlockedStatus(t.status) || normalizedText(t.type) === 'blocker'
    ).length;
    const byStatus = {};
    statusOptions.forEach((s) => {
      byStatus[s.key] = aggregatePoints(top.filter((t) => getTaskColumnKey(t) === s.key));
    });
    return { blocked, byStatus, totalPoints: aggregatePoints(top) };
  }, [getTaskColumnKey, statusOptions, tasks]);

  const setSwimlane = (value) => {
    const v = value === 'none' ? null : value;
    patchSavedView?.((prev) => ({
      ...prev,
      scrum: {
        ...DEFAULT_SCRUM_VIEW_BLOCK,
        ...(prev.scrum || {}),
        swimlane: v,
      },
    }));
  };

  const setWipLimit = (columnKey, raw) => {
    const v = raw === '' || raw == null ? NaN : Number(raw);
    patchSavedView?.((prev) => ({
      ...prev,
      scrum: {
        ...DEFAULT_SCRUM_VIEW_BLOCK,
        ...(prev.scrum || {}),
        wip_limits: {
          ...(prev.scrum?.wip_limits || {}),
          [columnKey]:
            raw === '' || raw == null || Number.isNaN(v) ? '' : v,
        },
      },
    }));
  };

  const resolveDrop = (overId) => {
    const parsed = parseDropTargetId(overId);
    if (parsed) return parsed;
    const text = String(overId || '');
    if (text.startsWith('task-')) {
      const overTaskId = text.replace('task-', '');
      const overTask = taskById[overTaskId];
      if (!overTask) return null;
      return { lane: getSwimlaneKey(overTask), column: getTaskColumnKey(overTask) };
    }
    return null;
  };

  const handleDragStart = (event) => {
    const id = String(event?.active?.id || '');
    if (!id.startsWith('task-')) return;
    setActiveTaskId(id.replace('task-', ''));
  };

  const handleDragEnd = (event) => {
    const activeId = String(event?.active?.id || '');
    const overId = event?.over?.id;
    setActiveTaskId(null);
    if (!activeId.startsWith('task-') || !overId) return;

    const taskId = activeId.replace('task-', '');
    const drop = resolveDrop(overId);
    const task = taskById[taskId];
    if (!task || !drop?.column || !fieldName) return;

    const targetColumn = drop.column;
    const targetLane = drop.lane;
    const currentColumn = getTaskColumnKey(task);
    const currentLane = getSwimlaneKey(task);

    const colMeta = statusOptions.find((c) => c.key === targetColumn);
    if (colMeta && isDoneColumn(colMeta) && !dodGatesSatisfied(task)) {
      toast({
        title: 'Definition of Done not complete',
        description: 'Complete all DoD checklist items before moving this card to Done.',
        variant: 'destructive',
      });
      return;
    }

    if (swimlaneMode && targetLane != null && targetLane !== currentLane) {
      if (swimlaneMode === 'assignee') {
        const val = targetLane === '__unset__' ? '' : targetLane;
        onCellChange?.(task, swimlaneFieldNames.assigneeField, val);
      } else if (swimlaneMode === 'epic') {
        const val = targetLane === '__unset__' ? '' : targetLane;
        onCellChange?.(task, swimlaneFieldNames.epicField, val);
      } else if (swimlaneMode === 'priority') {
        const val = targetLane === '__unset__' ? '' : targetLane;
        onCellChange?.(task, swimlaneFieldNames.priorityField, val);
      }
    }

    if (currentColumn === targetColumn) return;

    setOptimisticColumns((prev) => ({ ...prev, [taskId]: targetColumn }));
    onCellChange?.(task, fieldName, targetColumn === '__unset__' ? '' : targetColumn);
  };

  const renderColumnGrid = (laneKey) => (
    <div
      className={cn(
        'grid gap-3',
        statusOptions.length <= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'
      )}
    >
      {statusOptions.map((column) => {
        const cell = groupedByLaneAndColumn[laneKey]?.[column.key] || [];
        const count = cell.length;
        const lim = wipLimits[column.key];
        const limitNum = lim === '' || lim === undefined || lim === null ? null : Number(lim);
        const wipBreached = !isDoneColumn(column) && limitNum != null && Number.isFinite(limitNum) && count > limitNum;

        return (
          <DropColumn
            key={column.key}
            laneKey={laneKey}
            columnKey={column.key}
            className="rounded-lg border bg-muted/30 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{column.label}</h4>
              <div className="flex items-center gap-1">
                {wipBreached && (
                  <span title="WIP limit exceeded" className="text-[10px] font-semibold text-amber-600">
                    WIP
                  </span>
                )}
                <span
                  className={cn(
                    'rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground',
                    wipBreached && 'border-amber-500 text-amber-700 dark:text-amber-400'
                  )}
                >
                  {count}
                  {limitNum != null && Number.isFinite(limitNum) ? ` / ${limitNum}` : ''}
                </span>
              </div>
            </div>
            <SortableContext
              items={cell.map((t) => `task-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {cell.map((task) => (
                  <ScrumStoryCard key={task.id} task={task} assigneeMap={assigneeMap} />
                ))}
                <div className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
                  Drop stories here · {aggregatePoints(cell)} pts
                </div>
              </div>
            </SortableContext>
          </DropColumn>
        );
      })}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full space-y-4 text-left">
        <div className="flex flex-col gap-3 rounded-lg border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Scrum board</span>
            <Select
              value={swimlaneMode || 'none'}
              onValueChange={setSwimlane}
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue placeholder="Swimlanes" />
              </SelectTrigger>
              <SelectContent>
                {SWIMLANE_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden flex-wrap items-center gap-2 border-l pl-3 sm:flex">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                WIP
              </span>
              {statusOptions
                .filter((c) => !isDoneColumn(c))
                .map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    <span className="max-w-[4.5rem] truncate">{c.label}</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-11 px-1 text-xs"
                      value={
                        wipLimits[c.key] === '' ||
                        wipLimits[c.key] == null ||
                        wipLimits[c.key] === undefined
                          ? ''
                          : String(wipLimits[c.key])
                      }
                      onChange={(e) => setWipLimit(c.key, e.target.value)}
                    />
                  </label>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              Blocked: {metrics.blocked}
            </Badge>
            {statusOptions.map((s) => (
              <Badge key={s.key} variant="secondary" className="font-normal tabular-nums">
                {s.label}: {metrics.byStatus[s.key] ?? 0} pts
              </Badge>
            ))}
            <Badge variant="outline" className="font-normal tabular-nums">
              Σ {metrics.totalPoints} pts
            </Badge>
          </div>
        </div>

        {!swimlaneMode ? (
          renderColumnGrid('__all__')
        ) : (
          <div className="space-y-8">
            {laneKeys.map((laneKey) => (
              <div key={laneKey}>
                <div className="mb-2 flex items-center gap-2 border-b pb-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {swimlaneLabels[laneKey] || (laneKey === '__unset__' ? 'None' : laneKey)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {aggregatePoints(Object.values(groupedByLaneAndColumn[laneKey] || {}).flat())} pts
                  </span>
                </div>
                {renderColumnGrid(laneKey)}
              </div>
            ))}
          </div>
        )}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-full max-w-[300px] rounded-md border bg-background p-2 shadow-lg">
            <p className="text-sm font-medium line-clamp-2">{activeTask.title || 'Untitled'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {assigneeMap[activeTask.assignee] || activeTask.assignee || 'Unassigned'}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
