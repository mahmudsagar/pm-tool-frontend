/** @typedef {{ name: string, color: string }} LabelRegistryEntry */
/** @typedef {Record<string, LabelRegistryEntry>} LabelRegistry */

export const LABEL_PALETTE = [
  { key: 'blue', className: 'bg-blue-500/20 text-blue-800 border-blue-500/35 dark:text-blue-200' },
  { key: 'emerald', className: 'bg-emerald-500/20 text-emerald-800 border-emerald-500/35 dark:text-emerald-200' },
  { key: 'amber', className: 'bg-amber-500/20 text-amber-900 border-amber-500/35 dark:text-amber-200' },
  { key: 'rose', className: 'bg-rose-500/20 text-rose-800 border-rose-500/35 dark:text-rose-200' },
  { key: 'violet', className: 'bg-violet-500/20 text-violet-800 border-violet-500/35 dark:text-violet-200' },
  { key: 'cyan', className: 'bg-cyan-500/20 text-cyan-800 border-cyan-500/35 dark:text-cyan-200' },
  { key: 'orange', className: 'bg-orange-500/20 text-orange-800 border-orange-500/35 dark:text-orange-200' },
  { key: 'pink', className: 'bg-pink-500/20 text-pink-800 border-pink-500/35 dark:text-pink-200' },
];

/** @param {string | undefined | null} name */
export function normalizeLabelKey(name) {
  return String(name || '').trim().toLowerCase();
}

/** @param {unknown} raw @returns {string[]} */
export function parseLabelsString(raw) {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** @param {string[]} labels */
export function labelsToString(labels) {
  return labels.join(', ');
}

/** @param {string} name @param {LabelRegistry} [registry] */
export function pickColorForLabel(name, registry = {}) {
  const key = normalizeLabelKey(name);
  if (registry[key]?.color) return registry[key].color;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return LABEL_PALETTE[Math.abs(hash) % LABEL_PALETTE.length].key;
}

/** @param {string | undefined | null} colorKey */
export function getLabelBadgeClassName(colorKey) {
  const entry = LABEL_PALETTE.find((p) => p.key === colorKey);
  return entry?.className || LABEL_PALETTE[0].className;
}

/** @param {LabelRegistry} registry @param {string} labelName */
export function ensureLabelInRegistry(registry, labelName) {
  const trimmed = String(labelName || '').trim();
  const key = normalizeLabelKey(trimmed);
  if (!key) return registry;
  if (registry[key]) return registry;
  return {
    ...registry,
    [key]: { name: trimmed, color: pickColorForLabel(trimmed, registry) },
  };
}

/** @param {LabelRegistry} registry @param {string[]} labelNames */
export function syncRegistryWithLabels(registry, labelNames) {
  let next = { ...registry };
  for (const name of labelNames) {
    next = ensureLabelInRegistry(next, name);
  }
  return next;
}

/** @param {Array<{ labels?: unknown }>} tasks */
export function collectLabelsFromTasks(tasks) {
  const names = new Set();
  for (const task of tasks || []) {
    parseLabelsString(task?.labels).forEach((label) => names.add(label));
  }
  return [...names];
}

/** @param {LabelRegistry} registry */
export function listRegistryLabels(registry) {
  return Object.values(registry || {})
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}
