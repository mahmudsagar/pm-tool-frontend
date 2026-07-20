/** @param {Array<{ label?: string, value?: string }>} assigneeOptions */
export function buildAssigneeLabelMap(assigneeOptions = []) {
  const map = {};
  assigneeOptions.forEach((opt) => {
    if (opt?.value != null) {
      map[String(opt.value)] = opt.label || String(opt.value);
    }
  });
  return map;
}

/** @param {string | null | undefined} assigneeId @param {Record<string, string>} [assigneeMap] */
export function formatAssigneeLabel(assigneeId, assigneeMap = {}) {
  const raw = String(assigneeId || "").trim();
  if (!raw || raw.toLowerCase() === "unassigned") return "Unassigned";
  return assigneeMap[raw] || raw;
}

/** @param {{ task_id?: string, title?: string }} task */
export function formatTaskLabel(task) {
  if (!task) return "Unknown task";
  const title = task.title || "Untitled";
  return task.task_id ? `${task.task_id} · ${title}` : title;
}

/**
 * @param {Array<{ id?: string, task_id?: string, title?: string, subtasks?: Array }>} tasks
 */
export function buildTaskRefLookup(tasks = []) {
  const byId = new Map();
  const byTaskId = new Map();

  const register = (task) => {
    if (!task) return;
    if (task.id != null) byId.set(String(task.id), task);
    if (task.task_id) byTaskId.set(String(task.task_id), task);
    (task.subtasks || []).forEach(register);
  };

  tasks.forEach(register);

  const resolveRef = (ref) => {
    if (!ref) return null;
    const key = String(ref);
    return byId.get(key) || byTaskId.get(key) || null;
  };

  const labelForRef = (ref) => {
    const task = resolveRef(ref);
    return task ? formatTaskLabel(task) : String(ref || "");
  };

  return { resolveRef, labelForRef };
}
