import { daysBetween, type Task } from '@/features/board/model';

export type Zoom = 'days' | 'weeks' | 'months' | 'quarters';

export const PX_PER_DAY: Record<Zoom, number> = { days: 44, weeks: 18, months: 6, quarters: 2.2 };

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Visible date range: all dated tasks plus padding, and always today. */
export function chartRange(tasks: Task[], zoom: Zoom) {
  const today = startOfDay(new Date());
  let min = addDays(today, -14);
  let max = addDays(today, 45);
  for (const t of tasks) {
    if (t.start && t.start < min) min = t.start;
    if (t.due && t.due > max) max = t.due;
  }
  const pad = zoom === 'days' ? 3 : zoom === 'weeks' ? 7 : zoom === 'months' ? 30 : 60;
  let start = addDays(startOfDay(min), -pad);
  // Align to a Monday / first of month so the header units line up.
  if (zoom === 'days' || zoom === 'weeks') start = addDays(start, -((start.getDay() + 6) % 7));
  else start = new Date(start.getFullYear(), zoom === 'quarters' ? Math.floor(start.getMonth() / 3) * 3 : start.getMonth(), 1);
  const end = addDays(startOfDay(max), pad * 2);
  return { start, end, days: daysBetween(start, end) + 1 };
}

export interface HeaderUnit {
  label: string;
  sub?: string;
  left: number;
  width: number;
  today?: boolean;
}

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Top band (months or years) and bottom units (days, weeks, months, quarters). */
export function headerUnits(start: Date, days: number, zoom: Zoom): { top: HeaderUnit[]; bottom: HeaderUnit[] } {
  const ppd = PX_PER_DAY[zoom];
  const end = addDays(start, days);
  const top: HeaderUnit[] = [];
  const bottom: HeaderUnit[] = [];
  const pos = (d: Date) => daysBetween(start, d) * ppd;
  const today = startOfDay(new Date());

  // Top band: months for days/weeks, years for months/quarters.
  if (zoom === 'days' || zoom === 'weeks') {
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d < end) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const left = Math.max(0, pos(d));
      top.push({ label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), left, width: Math.min(pos(next), days * ppd) - left });
      d = next;
    }
  } else {
    let d = new Date(start.getFullYear(), 0, 1);
    while (d < end) {
      const next = new Date(d.getFullYear() + 1, 0, 1);
      const left = Math.max(0, pos(d));
      top.push({ label: String(d.getFullYear()), left, width: Math.min(pos(next), days * ppd) - left });
      d = next;
    }
  }

  if (zoom === 'days') {
    for (let i = 0; i < days; i += 1) {
      const d = addDays(start, i);
      bottom.push({ label: String(d.getDate()), sub: d.toLocaleDateString(undefined, { weekday: 'narrow' }), left: i * ppd, width: ppd, today: d.getTime() === today.getTime() });
    }
  } else if (zoom === 'weeks') {
    for (let i = 0; i < days; i += 7) {
      const d = addDays(start, i);
      bottom.push({ label: `W${isoWeek(d)}`, sub: d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }), left: i * ppd, width: 7 * ppd });
    }
  } else if (zoom === 'months') {
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d < end) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      bottom.push({ label: d.toLocaleDateString(undefined, { month: 'short' }), left: pos(d), width: pos(next) - pos(d) });
      d = next;
    }
  } else {
    let d = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
    while (d < end) {
      const next = new Date(d.getFullYear(), d.getMonth() + 3, 1);
      bottom.push({ label: `Q${Math.floor(d.getMonth() / 3) + 1}`, left: pos(d), width: pos(next) - pos(d) });
      d = next;
    }
  }
  return { top, bottom };
}

/**
 * Longest chain through finish-to-start dependencies, measured in days.
 * Returns the task ids on that chain (empty when there are no dependencies).
 */
export function criticalPath(tasks: Task[]): Set<string> {
  const dated = new Map(tasks.filter((t) => t.start && t.due).map((t) => [t.id, t]));
  const preds = new Map<string, string[]>();
  for (const t of dated.values()) preds.set(t.id, t.dependsOn.filter((id) => dated.has(id) && id !== t.id));
  if (![...preds.values()].some((p) => p.length)) return new Set();

  const memo = new Map<string, { len: number; prev: string | null }>();
  const visiting = new Set<string>();
  const dur = (t: Task) => daysBetween(t.start!, t.due!) + 1;
  const best = (id: string): { len: number; prev: string | null } => {
    const cached = memo.get(id);
    if (cached) return cached;
    if (visiting.has(id)) return { len: 0, prev: null }; // cycle guard
    visiting.add(id);
    let result = { len: dur(dated.get(id)!), prev: null as string | null };
    for (const p of preds.get(id) ?? []) {
      const r = best(p);
      if (r.len + dur(dated.get(id)!) > result.len) result = { len: r.len + dur(dated.get(id)!), prev: p };
    }
    visiting.delete(id);
    memo.set(id, result);
    return result;
  };
  let endId: string | null = null;
  let endLen = 0;
  for (const id of dated.keys()) {
    const r = best(id);
    if (r.len > endLen && (r.prev || [...preds.values()].some((p) => p.includes(id)))) {
      endLen = r.len;
      endId = id;
    }
  }
  const path = new Set<string>();
  while (endId) {
    path.add(endId);
    endId = memo.get(endId)?.prev ?? null;
  }
  return path.size > 1 ? path : new Set();
}
