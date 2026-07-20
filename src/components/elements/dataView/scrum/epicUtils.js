/** @typedef {{ name: string, color: string, goal?: string }} EpicRegistryEntry */
/** @typedef {Record<string, EpicRegistryEntry>} EpicRegistry */

export const EPIC_PALETTE = [
  { key: 'indigo', className: 'bg-indigo-500/20 text-indigo-800 border-indigo-500/35 dark:text-indigo-200' },
  { key: 'violet', className: 'bg-violet-500/20 text-violet-800 border-violet-500/35 dark:text-violet-200' },
  { key: 'sky', className: 'bg-sky-500/20 text-sky-800 border-sky-500/35 dark:text-sky-200' },
  { key: 'teal', className: 'bg-teal-500/20 text-teal-800 border-teal-500/35 dark:text-teal-200' },
  { key: 'lime', className: 'bg-lime-500/20 text-lime-900 border-lime-500/35 dark:text-lime-200' },
  { key: 'fuchsia', className: 'bg-fuchsia-500/20 text-fuchsia-800 border-fuchsia-500/35 dark:text-fuchsia-200' },
  { key: 'slate', className: 'bg-slate-500/20 text-slate-800 border-slate-500/35 dark:text-slate-200' },
  { key: 'red', className: 'bg-red-500/20 text-red-800 border-red-500/35 dark:text-red-200' },
];

/** @param {string | undefined | null} name */
export function normalizeEpicKey(name) {
  return String(name || '').trim().toLowerCase();
}

/** @param {unknown} raw */
export function parseEpicValue(raw) {
  return String(raw ?? '').trim();
}

/** @param {string} name @param {EpicRegistry} [registry] */
export function pickColorForEpic(name, registry = {}) {
  const key = normalizeEpicKey(name);
  if (registry[key]?.color) return registry[key].color;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return EPIC_PALETTE[Math.abs(hash) % EPIC_PALETTE.length].key;
}

/** @param {string | undefined | null} colorKey */
export function getEpicBadgeClassName(colorKey) {
  const entry = EPIC_PALETTE.find((p) => p.key === colorKey);
  return entry?.className || EPIC_PALETTE[0].className;
}

/** @param {EpicRegistry} registry @param {string} epicName @param {{ goal?: string }} [meta] */
export function ensureEpicInRegistry(registry, epicName, meta = {}) {
  const trimmed = String(epicName || '').trim();
  const key = normalizeEpicKey(trimmed);
  if (!key) return registry;
  if (registry[key]) {
    return {
      ...registry,
      [key]: {
        ...registry[key],
        ...(meta.goal !== undefined ? { goal: meta.goal } : {}),
      },
    };
  }
  return {
    ...registry,
    [key]: {
      name: trimmed,
      color: pickColorForEpic(trimmed, registry),
      goal: meta.goal || '',
    },
  };
}

/** @param {EpicRegistry} registry @param {string[]} epicNames */
export function syncRegistryWithEpics(registry, epicNames) {
  let next = { ...registry };
  for (const name of epicNames) {
    const trimmed = parseEpicValue(name);
    if (trimmed) next = ensureEpicInRegistry(next, trimmed);
  }
  return next;
}

/** @param {Array<{ epic?: unknown }>} tasks */
export function collectEpicsFromTasks(tasks) {
  const names = new Set();
  for (const task of tasks || []) {
    const epic = parseEpicValue(task?.epic);
    if (epic) names.add(epic);
  }
  return [...names];
}

/** @param {EpicRegistry} registry */
export function listRegistryEpics(registry) {
  return Object.values(registry || {})
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {EpicRegistry} registry @param {string} epicName */
export function resolveEpicDisplayName(registry, epicName) {
  const key = normalizeEpicKey(epicName);
  return registry[key]?.name || parseEpicValue(epicName);
}
