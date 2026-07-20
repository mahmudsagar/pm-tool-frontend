import { isScrumBoardKind } from '@/components/elements/dataView/scrum/scrumBoardConstants';

/** @param {{ custom_meta?: { values?: Record<string, unknown> } } | Record<string, unknown> | null | undefined} taskOrValues */
export function getTaskSprintValue(taskOrValues) {
  const values =
    taskOrValues && typeof taskOrValues === 'object' && 'custom_meta' in taskOrValues
      ? taskOrValues.custom_meta?.values
      : taskOrValues;
  return String(values?.sprint ?? '').trim();
}

/**
 * @param {Array<{ _id?: string, title?: string, name?: string, custom_meta?: object, subtasks?: Array }>} documents
 * @param {{ excludeTaskId?: string, sprintScope?: string | null }} [opts]
 *   sprintScope: null = no sprint filter; '' = backlog only; 'Sprint N' = that sprint
 */
export function buildDependencyOptionsFromDocuments(documents, opts = {}) {
  const { excludeTaskId, sprintScope = null } = opts;
  const byId = new Map();

  (documents || []).forEach((doc, index) => {
    if (!doc?._id) return;
    const parentTaskId = `TASK-${String(index + 1).padStart(3, '0')}`;
    const parentSprint = getTaskSprintValue(doc);

    if (sprintScope === null || parentSprint === String(sprintScope)) {
      if (String(doc._id) !== String(excludeTaskId)) {
        byId.set(String(doc._id), {
          value: String(doc._id),
          label: doc.title || doc.name || parentTaskId,
          taskId: parentTaskId,
          sprint: parentSprint,
        });
      }
    }

    (doc.subtasks || []).forEach((sub, si) => {
      if (!sub?._id) return;
      const subSprint = getTaskSprintValue(sub) || parentSprint;
      if (sprintScope !== null && subSprint !== String(sprintScope)) return;
      if (String(sub._id) === String(excludeTaskId)) return;
      byId.set(String(sub._id), {
        value: String(sub._id),
        label: sub.title || `Untitled Subtask ${si + 1}`,
        taskId: `${parentTaskId}.${si + 1}`,
        sprint: subSprint,
      });
    });
  });

  return Array.from(byId.values());
}

/**
 * @param {Array<{ value: string, sprint?: string }>} options
 * @param {Array<{ id?: string, sprint?: string, subtasks?: Array }>} propertyValues
 * @param {{ id?: string, sprint?: string, parent_id?: string }} item
 */
export function filterDependencyOptionsForTask(options, propertyValues, item) {
  if (!item?.id) return options;
  const rowSprint = String(item.sprint ?? '').trim();
  const flat = [];
  (propertyValues || []).forEach((row) => {
    flat.push(row);
    (row.subtasks || []).forEach((sub) => flat.push(sub));
  });
  const sprintById = new Map(flat.map((t) => [String(t.id), String(t.sprint ?? '').trim()]));

  return (options || []).filter((opt) => {
    if (String(opt.value) === String(item.id)) return false;
    const optSprint = opt.sprint ?? sprintById.get(String(opt.value)) ?? '';
    return optSprint === rowSprint;
  });
}

/**
 * @param {{ custom_meta?: object } | null | undefined} board
 * @param {{ _id?: string, custom_meta?: object, parent_id?: string } | null | undefined} currentTask
 * @returns {string | null} null = do not filter by sprint
 */
export function resolveDependencySprintScope(board, currentTask) {
  if (!isScrumBoardKind(board?.custom_meta)) return null;
  return getTaskSprintValue(currentTask);
}
