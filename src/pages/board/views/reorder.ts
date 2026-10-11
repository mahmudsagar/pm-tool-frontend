import type { Task } from '@/features/board/model';
import type { TaskUpdate } from '@/features/board/queries';

const STEP = 1000;

/**
 * Updates for dropping `moved` into `target` (the destination list, without `moved`) at `index`.
 * Uses the gap between neighbours when there is one; otherwise renumbers the list.
 */
export function reorderUpdates(target: Task[], moved: Task, index: number, patch: Record<string, unknown> = {}): TaskUpdate[] {
  const list = target.filter((t) => t.id !== moved.id);
  const before = list[index - 1];
  const after = list[index];
  const valid = (n: number | undefined) => typeof n === 'number' && n < Number.MAX_SAFE_INTEGER;
  const hasPatch = Object.keys(patch).length > 0;
  const values = hasPatch ? patch : undefined;

  if ((!before || valid(before.sortOrder)) && (!after || valid(after.sortOrder))) {
    const lo = before ? before.sortOrder : after ? after.sortOrder - 2 * STEP : 0;
    const hi = after ? after.sortOrder : lo + 2 * STEP;
    if (hi - lo > 1) return [{ id: moved.id, sort_order: Math.round((lo + hi) / 2), values }];
  }

  // No usable gap: renumber the whole destination list.
  const next = [...list.slice(0, index), moved, ...list.slice(index)];
  return next
    .map((t, i) => ({ t, order: (i + 1) * STEP }))
    .filter(({ t, order }) => t.id === moved.id || t.sortOrder !== order)
    .map(({ t, order }) => (t.id === moved.id ? { id: t.id, sort_order: order, values } : { id: t.id, sort_order: order }));
}
