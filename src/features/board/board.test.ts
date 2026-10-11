import { describe, expect, it } from 'vitest';
import { dateValues, normalizeTasks, parseDate, priorityValue, resolveFieldMap, statusCategory, statusOptions, toPriority, type BoardField, type RawBoard } from './model';
import { filterTasks, groupTasks, readView, sortTasks, DEFAULT_VIEW } from './view';
import { reorderUpdates } from '@/pages/board/views/reorder';
import { criticalPath } from '@/pages/board/views/timelineModel';

const FIELDS: BoardField[] = [
  { type: 'select', label: 'Status', name: 'status', options: [{ label: 'To Do', value: 'todo' }, { label: 'In Progress', value: 'in-progress' }, { label: 'Done', value: 'done' }] },
  { type: 'dynamic-select', label: 'Assignee', name: 'assignee', source: 'board-members' },
  { type: 'select', label: 'Priority', name: 'priority', options: [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }] },
  { type: 'daterange', label: 'Dates', name: 'dates' },
  { type: 'labels', label: 'Tags', name: 'labels' },
];

function board(docs: RawBoard['documents']): RawBoard {
  return { _id: 'b', name: 'B', user_id: 'u', custom_meta: { fields: FIELDS }, documents: docs };
}

describe('board model', () => {
  it('maps free-form statuses and priorities onto the canonical scales', () => {
    expect(statusCategory('In progress')).toBe('in_progress');
    expect(statusCategory('in_review')).toBe('review');
    expect(statusCategory('Completed')).toBe('done');
    expect(statusCategory('Blocked')).toBe('blocked');
    expect(statusCategory('backlog')).toBe('backlog');
    expect(statusCategory('')).toBe('todo');
    expect(toPriority('P0')).toBe('urgent');
    expect(toPriority('Critical')).toBe('urgent');
    expect(toPriority('normal')).toBe('medium');
    expect(toPriority('???')).toBeNull();
  });

  it('reads date-only strings as local days and writes ranges back in the board shape', () => {
    const d = parseDate('2026-03-05')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 5, 0]);
    const map = resolveFieldMap(FIELDS);
    expect(dateValues(map, d, d)).toEqual({ dates: { from: '2026-03-05', to: '2026-03-05' } });
    expect(dateValues(map, null, null)).toEqual({ dates: null });
    expect(dateValues(resolveFieldMap([]), null, d)).toEqual({ due_date: '2026-03-05' });
  });

  it('writes priorities with the board option values, falling back to the canonical name', () => {
    const map = resolveFieldMap(FIELDS);
    expect(priorityValue(FIELDS, map, 'high')).toBe('high');
    expect(priorityValue(FIELDS, map, 'urgent')).toBe('urgent');
    expect(priorityValue(FIELDS, map, null)).toBe('');
  });

  it('normalizes tasks with subtask progress, labels and server keys', () => {
    const map = resolveFieldMap(FIELDS);
    const tasks = normalizeTasks(
      board([
        {
          _id: 'p',
          title: 'Parent',
          task_key: 'B-1',
          custom_meta: { values: { status: 'in-progress', labels: 'api, infra', dates: { from: '2026-01-01', to: '2026-01-05' } } },
          subtasks: [
            { _id: 's1', title: 'A', parent_id: 'p', custom_meta: { values: { status: 'done' } } },
            { _id: 's2', title: 'B', parent_id: 'p', custom_meta: { values: { status: 'todo' } } },
          ],
        },
      ]),
      map,
    );
    expect(tasks.map((t) => t.id)).toEqual(['p', 's1', 's2']);
    expect(tasks[0]).toMatchObject({ key: 'B-1', labels: ['api', 'infra'], checklist: { done: 1, total: 2 }, progress: 50, subtaskIds: ['s1', 's2'] });
    expect(tasks[1].key).toBe('#1.1');
    expect(tasks[1].progress).toBe(100);
  });
});

describe('board view', () => {
  const map = resolveFieldMap(FIELDS);
  const tasks = normalizeTasks(
    board([
      { _id: 'a', title: 'Alpha', custom_meta: { values: { status: 'todo', priority: 'low', assignee: 'u1' } } },
      { _id: 'b', title: 'Beta', custom_meta: { values: { status: 'done', priority: 'high', assignee: 'u2' } } },
      { _id: 'c', title: 'Gamma', custom_meta: { values: { status: 'Waiting on vendor' } } },
    ]),
    map,
  );
  const statuses = statusOptions(FIELDS, map, tasks);

  it('keeps unknown statuses as their own groups and empty ones in place', () => {
    const groups = groupTasks(tasks, 'status', { fields: FIELDS, map, statuses, memberName: (id) => id });
    expect(groups.map((g) => [g.label, g.tasks.length])).toEqual([
      ['To Do', 1],
      ['In Progress', 0],
      ['Done', 1],
      ['Waiting on vendor', 1],
    ]);
    expect(groups[1].patch).toEqual({ status: 'in-progress' });
  });

  it('filters by assignee, unassigned and field conditions, and sorts by priority', () => {
    expect(filterTasks(tasks, { ...DEFAULT_VIEW, assignees: ['__none'] }, '').map((t) => t.id)).toEqual(['c']);
    expect(filterTasks(tasks, { ...DEFAULT_VIEW, filters: [{ field: 'priority', op: 'is', value: 'high' }] }, '').map((t) => t.id)).toEqual(['b']);
    expect(filterTasks(tasks, DEFAULT_VIEW, 'gam').map((t) => t.id)).toEqual(['c']);
    expect(sortTasks(tasks, { field: 'priority', dir: 'asc' }, new Map()).map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('reads saved views defensively', () => {
    expect(readView(null)).toEqual(DEFAULT_VIEW);
    const v = readView({ databoard: { view: 'kanban', filters: 'oops', kanban: { wip: { x: 3 } } } });
    expect(v.view).toBe('kanban');
    expect(v.filters).toEqual([]);
    expect(v.kanban).toMatchObject({ swimlane: 'none', wip: { x: 3 } });
  });
});

describe('reorder', () => {
  const t = (id: string, sortOrder: number) => ({ id, sortOrder }) as never;

  it('uses the gap between neighbours', () => {
    expect(reorderUpdates([t('a', 1000), t('b', 2000)], t('m', 9000), 1)).toEqual([{ id: 'm', sort_order: 1500, values: undefined }]);
    expect(reorderUpdates([t('a', 1000)], t('m', 9000), 1)).toEqual([{ id: 'm', sort_order: 2000, values: undefined }]);
  });

  it('renumbers when there is no gap or the order is unknown', () => {
    const updates = reorderUpdates([t('a', 1000), t('b', 1001)], t('m', 5), 1, { status: 'x' });
    expect(updates).toEqual([
      { id: 'm', sort_order: 2000, values: { status: 'x' } },
      { id: 'b', sort_order: 3000 },
    ]);
    const unknown = reorderUpdates([t('a', Number.MAX_SAFE_INTEGER)], t('m', Number.MAX_SAFE_INTEGER), 0);
    expect(unknown.map((u) => u.id)).toEqual(['m', 'a']);
  });
});

describe('critical path', () => {
  const task = (id: string, start: string, due: string, dependsOn: string[] = []) => ({ id, start: parseDate(start), due: parseDate(due), dependsOn }) as never;

  it('follows the longest dependency chain', () => {
    const path = criticalPath([
      task('a', '2026-01-01', '2026-01-10'),
      task('b', '2026-01-11', '2026-01-12', ['a']),
      task('c', '2026-01-01', '2026-01-02'),
      task('d', '2026-01-03', '2026-01-04', ['c']),
    ]);
    expect([...path].sort()).toEqual(['a', 'b']);
  });

  it('is empty without dependencies and survives cycles', () => {
    expect(criticalPath([task('a', '2026-01-01', '2026-01-02')]).size).toBe(0);
    expect(() => criticalPath([task('a', '2026-01-01', '2026-01-02', ['b']), task('b', '2026-01-03', '2026-01-04', ['a'])])).not.toThrow();
  });
});
