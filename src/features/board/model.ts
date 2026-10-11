import { parseLabelsString } from '@/components/elements/dataView/scrum/labelUtils';
import { parseDodChecklist } from '@/components/elements/dataView/scrum/dodUtils';

/* ------------------------------------------------------------------ types */

export interface FieldOption {
  label: string;
  value: string;
}

export interface BoardField {
  name: string;
  label: string;
  type: string;
  hasOptions?: boolean;
  options?: FieldOption[];
  source?: string;
  initialized?: boolean;
}

export interface RawTask {
  _id: string;
  title?: string;
  name?: string;
  parent_id?: string | null;
  board_id?: string;
  custom_meta?: { fields?: BoardField[]; values?: Record<string, unknown> };
  subtasks?: RawTask[];
  task_key?: string;
  task_number?: number;
  sort_order?: number | null;
  comment_count?: number;
  attachment_count?: number;
  attachments?: unknown[];
  inner_comments?: unknown[];
  user_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawBoard {
  _id: string;
  name: string;
  description?: string;
  key?: string;
  user_id: string;
  is_private?: boolean;
  shared_members?: string[];
  shared_teams?: string[];
  space_id?: string;
  folder_id?: string;
  group_id?: string;
  custom_meta?: { fields?: BoardField[]; board_kind?: string };
  saved_view?: Record<string, unknown> | null;
  automations?: Record<string, unknown> | null;
  documents?: RawTask[];
}

export type StatusCategory = 'backlog' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  key: string;
  number: number | null;
  title: string;
  parentId: string | null;
  values: Record<string, unknown>;
  status: string;
  statusCategory: StatusCategory;
  priority: Priority | null;
  assignees: string[];
  start: Date | null;
  due: Date | null;
  labels: string[];
  points: number | null;
  estimate: string;
  type: string;
  epic: string;
  dependsOn: string[];
  progress: number | null;
  checklist: { done: number; total: number } | null;
  subtaskIds: string[];
  subtasksDone: number;
  comments: number;
  attachments: number;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  raw: RawTask;
}

/** Field names the views rely on, resolved per board (boards created by older code use other names). */
export interface FieldMap {
  status: string;
  priority: string;
  assignee: string;
  dates: string | null;
  start: string | null;
  due: string | null;
  labels: string | null;
  points: string | null;
  estimate: string | null;
  type: string | null;
  epic: string | null;
  dependsOn: string | null;
  checklist: string | null;
}

/* --------------------------------------------------------------- helpers */

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();

function findField(fields: BoardField[], ...needles: string[]): BoardField | undefined {
  for (const needle of needles) {
    const exact = fields.find((f) => norm(f.name) === needle);
    if (exact) return exact;
  }
  for (const needle of needles) {
    const byLabel = fields.find((f) => norm(f.label) === needle);
    if (byLabel) return byLabel;
  }
  return undefined;
}

export function resolveFieldMap(fields: BoardField[]): FieldMap {
  const dates = fields.find((f) => f.type === 'daterange');
  return {
    status: findField(fields, 'status', 'stage', 'state')?.name ?? 'status',
    priority: findField(fields, 'priority')?.name ?? 'priority',
    assignee: findField(fields, 'assignee', 'owner', 'assigned to')?.name ?? 'assignee',
    dates: dates?.name ?? null,
    start: findField(fields, 'start_date', 'start date', 'start')?.name ?? null,
    due: findField(fields, 'due_date', 'due date', 'due', 'deadline')?.name ?? null,
    labels: fields.find((f) => f.type === 'labels')?.name ?? findField(fields, 'labels', 'tags')?.name ?? null,
    points: findField(fields, 'story_points', 'story points', 'points', 'story pts')?.name ?? null,
    estimate: findField(fields, 'estimate', 'est')?.name ?? null,
    type: findField(fields, 'type', 'issue type')?.name ?? null,
    epic: fields.find((f) => f.type === 'epic')?.name ?? findField(fields, 'epic')?.name ?? null,
    dependsOn: findField(fields, 'depends_on', 'blocked_by', 'dependent on')?.name ?? null,
    checklist: fields.find((f) => f.type === 'dod_checklist')?.name ?? null,
  };
}

export function statusCategory(value: unknown): StatusCategory {
  const v = norm(value).replace(/[_-]+/g, ' ');
  if (!v) return 'todo';
  if (/(^| )(done|complete|completed|closed|shipped|resolved)( |$)/.test(v)) return 'done';
  if (/(block|stuck|on hold)/.test(v)) return 'blocked';
  if (/(review|qa|testing|verify)/.test(v)) return 'review';
  if (/(progress|doing|active|started|wip)/.test(v)) return 'in_progress';
  if (/(backlog|icebox|later)/.test(v)) return 'backlog';
  return 'todo';
}

export function toPriority(value: unknown): Priority | null {
  const v = norm(value);
  if (!v) return null;
  if (['urgent', 'critical', 'p0', 'highest', 'blocker'].includes(v)) return 'urgent';
  if (['high', 'p1', 'major'].includes(v)) return 'high';
  if (['medium', 'normal', 'p2', 'moderate'].includes(v)) return 'medium';
  if (['low', 'p3', 'p4', 'minor', 'lowest', 'trivial'].includes(v)) return 'low';
  return null;
}

export const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === 'string' || typeof raw === 'number') {
    // Date-only strings are local calendar days, not UTC midnights.
    const m = typeof raw === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) : null;
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Local calendar day as YYYY-MM-DD (what date fields store). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readDates(values: Record<string, unknown>, map: FieldMap) {
  let start: Date | null = null;
  let due: Date | null = null;
  if (map.dates) {
    const range = values[map.dates];
    if (range && typeof range === 'object') {
      const r = range as Record<string, unknown>;
      start = parseDate(r.from ?? r.start);
      due = parseDate(r.to ?? r.end);
    } else if (range) {
      due = parseDate(range);
    }
  }
  start = start ?? parseDate(map.start ? values[map.start] : values.start_date);
  due = due ?? parseDate(map.due ? values[map.due] : values.due_date);
  if (start && !due) due = start;
  return { start, due };
}

function readAssignees(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((v) => (typeof v === 'object' && v ? String((v as { value?: string }).value ?? '') : String(v))).filter(Boolean);
  if (typeof raw === 'object') return [String((raw as { value?: string }).value ?? '')].filter(Boolean);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function readNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/* ----------------------------------------------------------- normalising */

function toTask(doc: RawTask, map: FieldMap, fallbackKey: string, subtasks: RawTask[]): Task {
  const values = doc.custom_meta?.values ?? {};
  const status = String(values[map.status] ?? '');
  const { start, due } = readDates(values, map);
  const checklistItems = map.checklist ? parseDodChecklist(values[map.checklist]) : [];
  const subtasksDone = subtasks.filter((s) => statusCategory(s.custom_meta?.values?.[map.status]) === 'done').length;
  const checklist =
    checklistItems.length > 0
      ? { done: checklistItems.filter((i: { done?: boolean }) => i.done).length, total: checklistItems.length }
      : subtasks.length > 0
        ? { done: subtasksDone, total: subtasks.length }
        : null;
  const explicitProgress = readNumber(values.progress);
  const category = statusCategory(status);
  const progress =
    explicitProgress ?? (category === 'done' ? 100 : checklist && checklist.total ? Math.round((checklist.done / checklist.total) * 100) : null);
  const deps = map.dependsOn ? values[map.dependsOn] : values.depends_on;

  return {
    id: doc._id,
    key: doc.task_key || fallbackKey,
    number: doc.task_number ?? null,
    title: doc.title || doc.name || 'Untitled task',
    parentId: doc.parent_id || null,
    values,
    status,
    statusCategory: category,
    priority: toPriority(values[map.priority]),
    assignees: readAssignees(values[map.assignee]),
    start,
    due,
    labels: map.labels ? parseLabelsString(values[map.labels]) : [],
    points: map.points ? readNumber(values[map.points]) : null,
    estimate: map.estimate ? String(values[map.estimate] ?? '') : '',
    type: map.type ? String(values[map.type] ?? '') : '',
    epic: map.epic ? String(values[map.epic] ?? '').trim() : '',
    dependsOn: String(deps ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    progress: progress === null ? null : Math.max(0, Math.min(100, progress)),
    checklist,
    subtaskIds: subtasks.map((s) => s._id),
    subtasksDone,
    comments: doc.comment_count ?? (Array.isArray(doc.inner_comments) ? doc.inner_comments.length : 0),
    attachments: doc.attachment_count ?? (Array.isArray(doc.attachments) ? doc.attachments.length : 0),
    sortOrder: typeof doc.sort_order === 'number' ? doc.sort_order : Number.MAX_SAFE_INTEGER,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    raw: doc,
  };
}

/** Flattens a board's documents into tasks (parents first, then their subtasks). */
export function normalizeTasks(board: RawBoard, map: FieldMap): Task[] {
  const tasks: Task[] = [];
  (board.documents ?? []).forEach((doc, index) => {
    const subtasks = doc.subtasks ?? [];
    const parentKey = `#${index + 1}`;
    tasks.push(toTask(doc, map, parentKey, subtasks));
    subtasks.forEach((sub, si) => tasks.push(toTask(sub, map, `${parentKey}.${si + 1}`, [])));
  });
  return tasks;
}

/* ------------------------------------------------------------- statuses */

export interface StatusOption extends FieldOption {
  category: StatusCategory;
}

const DEFAULT_STATUSES: FieldOption[] = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Review', value: 'review' },
  { label: 'Done', value: 'done' },
];

export function statusOptions(fields: BoardField[], map: FieldMap, tasks: Task[]): StatusOption[] {
  const field = fields.find((f) => f.name === map.status);
  const base = field?.options?.length ? field.options : DEFAULT_STATUSES;
  const known = new Set(base.map((o) => norm(o.value)));
  const extras = tasks
    .map((t) => t.status)
    .filter((s) => s && !known.has(norm(s)) && !base.some((o) => norm(o.label) === norm(s)));
  const all = [...base, ...Array.from(new Set(extras)).map((s) => ({ label: s, value: s }))];
  return all.map((o) => ({ ...o, category: statusCategory(o.value || o.label) }));
}

/** Matches a stored status to its option (stored values may be labels or values). */
export function findStatusOption(options: StatusOption[], value: string): StatusOption | undefined {
  const v = norm(value);
  return options.find((o) => norm(o.value) === v) ?? options.find((o) => norm(o.label) === v);
}

/** The value to write for a canonical priority, using the board's own option values. */
export function priorityValue(fields: BoardField[], map: FieldMap, priority: Priority | null): string {
  if (!priority) return '';
  const field = fields.find((f) => f.name === map.priority);
  const match = field?.options?.find((o) => toPriority(o.value) === priority || toPriority(o.label) === priority);
  return match?.value ?? priority;
}

export function isOverdue(task: Task, now = new Date()) {
  if (!task.due || task.statusCategory === 'done') return false;
  const end = new Date(task.due);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < now.getTime();
}

export function daysBetween(a: Date, b: Date) {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((db - da) / 86_400_000);
}

/** Values to write when a task's dates change, in whatever shape this board stores them. */
export function dateValues(map: FieldMap, start: Date | null, due: Date | null): Record<string, unknown> {
  if (map.dates) {
    return { [map.dates]: start || due ? { from: start ? toDateKey(start) : due ? toDateKey(due) : null, to: due ? toDateKey(due) : null } : null };
  }
  const out: Record<string, unknown> = {};
  out[map.due ?? 'due_date'] = due ? toDateKey(due) : null;
  if (map.start || start) out[map.start ?? 'start_date'] = start ? toDateKey(start) : null;
  return out;
}
