import { priorityValue, statusCategory, type BoardField, type FieldMap, type Task } from './model';
import type { TaskUpdate } from './queries';

/** Toggles stored on `board.automations` (managed in the Automations panel). */
export interface AutomationToggles {
  status?: boolean;
  typeBased?: boolean;
  dependency?: boolean;
}

interface Context {
  tasks: Task[];
  fields: BoardField[];
  map: FieldMap;
  toggles: AutomationToggles;
  doneValue: string;
}

/**
 * Follow-up edits caused by changing one task, ported from the original board page:
 * finishing the last subtask finishes the parent, finishing a parent finishes its
 * not-started subtasks, a blocked subtask flags the parent, and bugs default to High.
 * Returns extra updates plus short notes to show the user.
 */
export function followUps(task: Task, values: Record<string, unknown>, ctx: Context): { updates: TaskUpdate[]; notes: string[] } {
  const { tasks, map, toggles } = ctx;
  const updates: TaskUpdate[] = [];
  const notes: string[] = [];
  const byId = new Map(tasks.map((t) => [t.id, t]));

  if (toggles.status !== false && map.status in values) {
    const next = statusCategory(values[map.status]);
    const parent = task.parentId ? byId.get(task.parentId) : undefined;

    if (parent && next === 'done') {
      const siblings = parent.subtaskIds.map((id) => byId.get(id)).filter(Boolean) as Task[];
      const allDone = siblings.every((s) => (s.id === task.id ? true : s.statusCategory === 'done'));
      if (allDone && parent.statusCategory !== 'done') {
        updates.push({ id: parent.id, values: { [map.status]: ctx.doneValue } });
        notes.push(`All subtasks done, so “${parent.title}” is done too.`);
      }
    }
    if (parent && next === 'blocked' && !parent.values.risk_flag) {
      updates.push({ id: parent.id, values: { risk_flag: true, risk_reason: 'Blocked subtask' } });
    }
    if (!task.parentId && next === 'done') {
      for (const id of task.subtaskIds) {
        const sub = byId.get(id);
        if (sub && (sub.statusCategory === 'todo' || sub.statusCategory === 'backlog')) {
          updates.push({ id, values: { [map.status]: ctx.doneValue } });
        }
      }
    }
  }

  if (toggles.dependency !== false && map.status in values && statusCategory(values[map.status]) === 'done') {
    const unblocked = tasks.filter((t) => t.dependsOn.includes(task.id) && t.statusCategory !== 'done');
    if (unblocked.length === 1) notes.push(`“${unblocked[0].title}” can start now.`);
    else if (unblocked.length > 1) notes.push(`${unblocked.length} dependent tasks can start now.`);
  }

  if (toggles.typeBased !== false && map.type && map.type in values) {
    const isBug = /bug/i.test(String(values[map.type] ?? ''));
    if (isBug && task.priority !== 'urgent' && task.priority !== 'high' && !(map.priority in values)) {
      updates.push({ id: task.id, values: { [map.priority]: priorityValue(ctx.fields, map, 'high') } });
      notes.push('Bugs default to High priority.');
    }
  }

  return { updates, notes };
}
