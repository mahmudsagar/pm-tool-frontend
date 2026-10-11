import {
  PRIORITY_ORDER,
  findStatusOption,
  isOverdue,
  parseDate,
  priorityValue,
  type BoardField,
  type FieldMap,
  type Priority,
  type StatusCategory,
  type StatusOption,
  type Task,
} from './model';

export type BoardViewType = 'table' | 'kanban' | 'timeline' | 'calendar';
export type SortField = 'manual' | 'priority' | 'due' | 'title' | 'created' | 'updated' | 'status' | 'points';
export type FilterOp = 'is' | 'is_not' | 'contains' | 'is_empty' | 'is_not_empty' | 'overdue';

export interface ViewFilter {
  field: string;
  op: FilterOp;
  value?: string;
}

export interface DataboardView {
  view: BoardViewType;
  group_by: string | null;
  sort: { field: SortField; dir: 'asc' | 'desc' };
  filters: ViewFilter[];
  assignees: string[];
  hidden_columns: string[];
  collapsed: string[];
  kanban: { group_by: string | null; swimlane: 'none' | 'epic' | 'assignee' | 'priority'; wip: Record<string, number> };
  calendar: { mode: 'month' | 'week' | 'day' | 'list'; show_unscheduled: boolean };
  timeline: { zoom: 'days' | 'weeks' | 'months' | 'quarters'; group_by: 'none' | 'status' | 'assignee' | 'epic' | 'parent'; critical_path: boolean };
}

export const DEFAULT_VIEW: DataboardView = {
  view: 'table',
  group_by: 'status',
  sort: { field: 'manual', dir: 'asc' },
  filters: [],
  assignees: [],
  hidden_columns: [],
  collapsed: [],
  kanban: { group_by: 'status', swimlane: 'none', wip: {} },
  calendar: { mode: 'month', show_unscheduled: true },
  timeline: { zoom: 'weeks', group_by: 'parent', critical_path: true },
};

/** Reads `saved_view.databoard`, falling back to defaults for anything missing or malformed. */
export function readView(saved: Record<string, unknown> | null | undefined): DataboardView {
  const raw = (saved?.databoard ?? {}) as Partial<DataboardView>;
  return {
    ...DEFAULT_VIEW,
    ...raw,
    sort: { ...DEFAULT_VIEW.sort, ...(raw.sort ?? {}) },
    filters: Array.isArray(raw.filters) ? raw.filters : [],
    assignees: Array.isArray(raw.assignees) ? raw.assignees : [],
    hidden_columns: Array.isArray(raw.hidden_columns) ? raw.hidden_columns : [],
    collapsed: Array.isArray(raw.collapsed) ? raw.collapsed : [],
    kanban: { ...DEFAULT_VIEW.kanban, ...(raw.kanban ?? {}), wip: { ...(raw.kanban?.wip ?? {}) } },
    calendar: { ...DEFAULT_VIEW.calendar, ...(raw.calendar ?? {}) },
    timeline: { ...DEFAULT_VIEW.timeline, ...(raw.timeline ?? {}) },
  };
}

/* ---------------------------------------------------------- filtering */

/** Semantic fields available in group/sort/filter menus, before the board's own fields. */
export const SEMANTIC_FIELDS = ['status', 'priority', 'assignee'] as const;

function cellText(task: Task, field: string): string {
  switch (field) {
    case 'status':
      return task.status;
    case 'priority':
      return task.priority ?? '';
    case 'assignee':
      return task.assignees.join(',');
    case 'labels':
      return task.labels.join(',');
    case 'title':
      return task.title;
    case '__due':
      return task.due ? task.due.toISOString() : '';
    default: {
      const v = task.values[field];
      if (v === null || v === undefined) return '';
      return typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }
}

function matches(task: Task, f: ViewFilter): boolean {
  const cell = cellText(task, f.field).toLowerCase();
  const value = String(f.value ?? '').toLowerCase();
  switch (f.op) {
    case 'is':
      return f.field === 'assignee' || f.field === 'labels' ? cell.split(',').includes(value) : cell === value;
    case 'is_not':
      return f.field === 'assignee' || f.field === 'labels' ? !cell.split(',').includes(value) : cell !== value;
    case 'contains':
      return cell.includes(value);
    case 'is_empty':
      return cell === '';
    case 'is_not_empty':
      return cell !== '';
    case 'overdue':
      return isOverdue(task);
    default:
      return true;
  }
}

export function filterTasks(tasks: Task[], view: DataboardView, search: string): Task[] {
  const q = search.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!q || t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q) || t.labels.some((l) => l.toLowerCase().includes(q))) &&
      (view.assignees.length === 0 ||
        view.assignees.some((a) => (a === '__none' ? t.assignees.length === 0 : t.assignees.includes(a)))) &&
      view.filters.every((f) => matches(t, f)),
  );
}

/* ------------------------------------------------------------ sorting */

export function sortTasks(tasks: Task[], sort: DataboardView['sort'], statusOrder: Map<string, number>): Task[] {
  const dir = sort.dir === 'desc' ? -1 : 1;
  const time = (d: Date | null) => (d ? d.getTime() : Number.POSITIVE_INFINITY);
  const cmp = (a: Task, b: Task): number => {
    switch (sort.field) {
      case 'priority':
        return (a.priority ? PRIORITY_ORDER[a.priority] : 9) - (b.priority ? PRIORITY_ORDER[b.priority] : 9);
      case 'due':
        return time(a.due) - time(b.due);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'created':
        return String(a.createdAt).localeCompare(String(b.createdAt));
      case 'updated':
        return String(a.updatedAt).localeCompare(String(b.updatedAt));
      case 'status':
        return (statusOrder.get(a.status) ?? 99) - (statusOrder.get(b.status) ?? 99);
      case 'points':
        return (a.points ?? -1) - (b.points ?? -1);
      default:
        return a.sortOrder - b.sortOrder || String(a.createdAt).localeCompare(String(b.createdAt));
    }
  };
  return [...tasks].sort((a, b) => cmp(a, b) * (sort.field === 'manual' ? 1 : dir) || a.sortOrder - b.sortOrder);
}

/* ----------------------------------------------------------- grouping */

export interface TaskGroup {
  id: string;
  label: string;
  /** Status category, used for dot colour. */
  category?: StatusCategory;
  priority?: Priority;
  /** Values to write when a task is dropped into this group. */
  patch: Record<string, unknown>;
  tasks: Task[];
}

export interface GroupContext {
  fields: BoardField[];
  map: FieldMap;
  statuses: StatusOption[];
  memberName: (id: string) => string;
}

export const PRIORITY_LABEL: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };

/** Splits tasks into ordered groups by a semantic or custom field. Empty status groups are kept. */
export function groupTasks(tasks: Task[], groupBy: string | null, ctx: GroupContext): TaskGroup[] {
  const { fields, map, statuses } = ctx;
  if (!groupBy) return [{ id: '__all', label: 'All tasks', patch: {}, tasks }];

  if (groupBy === 'status') {
    const groups: TaskGroup[] = statuses.map((s) => ({ id: `s:${s.value}`, label: s.label, category: s.category, patch: { [map.status]: s.value }, tasks: [] }));
    const fallback = groups[0];
    for (const t of tasks) {
      const opt = findStatusOption(statuses, t.status);
      const g = (opt && groups.find((x) => x.id === `s:${opt.value}`)) || fallback;
      g?.tasks.push(t);
    }
    return groups;
  }

  if (groupBy === 'priority') {
    const order: (Priority | null)[] = ['urgent', 'high', 'medium', 'low', null];
    return order
      .map((p) => ({
        id: `p:${p ?? 'none'}`,
        label: p ? PRIORITY_LABEL[p] : 'No priority',
        priority: p ?? undefined,
        patch: { [map.priority]: priorityValue(fields, map, p) },
        tasks: tasks.filter((t) => t.priority === p),
      }))
      .filter((g) => g.tasks.length > 0 || g.priority);
  }

  if (groupBy === 'assignee') {
    const ids = Array.from(new Set(tasks.flatMap((t) => t.assignees.slice(0, 1))));
    const groups = ids
      .map((id) => ({ id: `a:${id}`, label: ctx.memberName(id), patch: { [map.assignee]: id }, tasks: tasks.filter((t) => t.assignees[0] === id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const none = tasks.filter((t) => t.assignees.length === 0);
    return [...groups, { id: 'a:none', label: 'Unassigned', patch: { [map.assignee]: '' }, tasks: none }];
  }

  // Any other field: group by its raw value, in option order when it has options.
  const field = fields.find((f) => f.name === groupBy);
  const valueOf = (t: Task) => {
    if (groupBy === map.labels) return t.labels[0] ?? '';
    const v = t.values[groupBy];
    return v === null || v === undefined ? '' : String(typeof v === 'object' ? ((v as { value?: string }).value ?? '') : v);
  };
  const options = field?.options ?? [];
  const seen = new Map<string, TaskGroup>();
  for (const o of options) seen.set(o.value, { id: `f:${o.value}`, label: o.label, patch: { [groupBy]: o.value }, tasks: [] });
  for (const t of tasks) {
    const v = valueOf(t);
    const opt = options.find((o) => o.value === v || o.label === v);
    const key = opt?.value ?? v;
    if (!seen.has(key)) seen.set(key, { id: `f:${key}`, label: key || `No ${field?.label?.toLowerCase() ?? groupBy}`, patch: { [groupBy]: key }, tasks: [] });
    seen.get(key)!.tasks.push(t);
  }
  const list = Array.from(seen.values());
  const empty = list.filter((g) => g.id === 'f:');
  return [...list.filter((g) => g.id !== 'f:'), ...empty];
}

/** Fields that make sense to group by: semantic ones plus selects and short text fields. */
export function groupableFields(fields: BoardField[], map: FieldMap): { value: string; label: string }[] {
  const reserved = new Set([map.status, map.priority, map.assignee]);
  const extra = fields
    .filter((f) => !reserved.has(f.name) && ['select', 'input', 'text', 'epic', 'labels'].includes(f.type))
    .filter((f) => !['title', 'description', 'test_coverage_ref', 'depends_on'].includes(f.name))
    .map((f) => ({ value: f.name, label: f.label }));
  return [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'assignee', label: 'Assignee' },
    ...extra,
  ];
}

/** True when the task's due date falls on this calendar day. */
export function isSameDay(a: Date | null, b: Date) {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export { parseDate };
