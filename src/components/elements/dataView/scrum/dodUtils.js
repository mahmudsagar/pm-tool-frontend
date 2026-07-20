/** @typedef {{ id: string, label: string, done?: boolean }} DodChecklistItem */

/** @param {unknown} raw @returns {DodChecklistItem[]} */
export function parseDodChecklist(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => normalizeDodItem(item, index))
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item, index) => normalizeDodItem(item, index)).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

/** @param {unknown} item @param {number} index */
function normalizeDodItem(item, index) {
  if (typeof item === 'string') {
    const label = item.trim();
    if (!label) return null;
    return { id: `dod-${index}`, label, done: false };
  }
  if (!item || typeof item !== 'object') return null;
  const label = String(item.label ?? item.text ?? '').trim();
  if (!label) return null;
  return {
    id: String(item.id || `dod-${index}`),
    label,
    done: Boolean(item.done),
  };
}

/** @param {DodChecklistItem[]} items */
export function serializeDodChecklist(items) {
  const normalized = (items || [])
    .map((item, index) => normalizeDodItem(item, index))
    .filter(Boolean);
  if (!normalized.length) return '';
  return JSON.stringify(normalized);
}

/** @param {string} label */
export function createDodItem(label) {
  const trimmed = String(label || '').trim();
  return {
    id: `dod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: trimmed,
    done: false,
  };
}

/** @param {unknown} raw */
export function dodChecklistSummary(raw) {
  const items = parseDodChecklist(raw);
  if (!items.length) return null;
  const done = items.filter((item) => item.done).length;
  return { done, total: items.length, items };
}

/** @param {unknown} raw */
export function dodGatesSatisfied(raw) {
  const items = parseDodChecklist(raw);
  if (!items.length) return true;
  return items.every((item) => item.done);
}
