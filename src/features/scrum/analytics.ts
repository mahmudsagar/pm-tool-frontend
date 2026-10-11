import { parseDate, toDateKey, type BoardCapacity, type MemberCapacity, type Task } from '@/features/board/model';

/* ------------------------------------------------------------- numbers */

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
export function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1);
}
export function percentile(xs: number[], p: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i];
}
export function rollingAvg(xs: number[], n = 3) {
  return xs.map((_, i) => mean(xs.slice(Math.max(0, i - n + 1), i + 1)));
}
export const round1 = (n: number) => Math.round(n * 10) / 10;

/* --------------------------------------------------------------- dates */

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function dayRange(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), from.getDate()); d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function isWorkingDay(d: Date, workingDays: number[] = DEFAULT_WORKING_DAYS) {
  return workingDays.includes(d.getDay());
}

export function workingDaysBetween(from: Date, to: Date, workingDays = DEFAULT_WORKING_DAYS) {
  return dayRange(from, to).filter((d) => isWorkingDay(d, workingDays));
}

/** Sprint dates as Dates, with today clamped into the range. */
export function sprintWindow(sprint: { start_date?: string | null; end_date?: string | null } | null | undefined, now = new Date()) {
  const start = parseDate(sprint?.start_date ?? null);
  const end = parseDate(sprint?.end_date ?? null);
  if (!start || !end) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = dayRange(start, end);
  const dayIndex = Math.max(0, Math.min(days.length - 1, days.findIndex((d) => d.getTime() === today.getTime())));
  const elapsed = today < start ? -1 : today > end ? days.length : dayIndex;
  return { start, end, days, today, elapsed, daysLeft: Math.max(0, days.length - 1 - Math.max(0, elapsed)), ended: today > end, notStarted: today < start };
}

/* ----------------------------------------------------------- burndown */

/** Ideal remaining work per calendar day, falling only on working days. */
export function idealLine(days: Date[], startScope: number, workingDays = DEFAULT_WORKING_DAYS): number[] {
  // Day one starts at full scope; the burn is spread over the working days after it.
  const work = days.slice(1).filter((d) => isWorkingDay(d, workingDays)).length;
  if (!work) return days.map(() => startScope);
  const step = startScope / work;
  let left = startScope;
  return days.map((d, i) => {
    if (i > 0 && isWorkingDay(d, workingDays)) left -= step;
    return Math.max(0, round1(left));
  });
}

/** Small deterministic PRNG so forecasts don't jump on every render. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Forecast {
  /** Probability (0..1) that remaining work is done within `daysAvailable` working days. */
  probability: number;
  /** Working days needed at the 50th / 85th / 95th percentile (Infinity when there is no throughput). */
  p50: number;
  p85: number;
  p95: number;
  /** Remaining work after each future working day: [low (P15), mid (P50), high (P85)]. */
  cone: [number, number, number][];
}

/**
 * Monte Carlo forecast from historical daily throughput samples (points or issues done per working day).
 * Zero-throughput days are kept: they are part of the real distribution.
 */
export function monteCarlo(samples: number[], remaining: number, daysAvailable: number, runs = 2000, seed = 42): Forecast {
  const usable = samples.filter((s) => Number.isFinite(s) && s >= 0);
  if (remaining <= 0) return { probability: 1, p50: 0, p85: 0, p95: 0, cone: [] };
  if (!usable.length || sum(usable) === 0) return { probability: 0, p50: Infinity, p85: Infinity, p95: Infinity, cone: [] };
  const rand = mulberry32(seed);
  const horizon = Math.max(daysAvailable, 1);
  const finish: number[] = [];
  const paths: number[][] = Array.from({ length: horizon }, () => []);
  const maxDays = 365;
  for (let r = 0; r < runs; r += 1) {
    let left = remaining;
    let day = 0;
    while (left > 0 && day < maxDays) {
      left -= usable[Math.floor(rand() * usable.length)];
      if (day < horizon) paths[day].push(Math.max(0, left));
      day += 1;
    }
    for (let d = day; d < horizon; d += 1) paths[d].push(0);
    finish.push(left > 0 ? Infinity : day);
  }
  return {
    probability: finish.filter((d) => d <= daysAvailable).length / runs,
    p50: percentile(finish, 50),
    p85: percentile(finish, 85),
    p95: percentile(finish, 95),
    cone: paths.map((p) => [percentile(p, 15), percentile(p, 50), percentile(p, 85)] as [number, number, number]),
  };
}

/** Calendar date after `n` working days from `from` (exclusive). */
export function addWorkingDays(from: Date, n: number, workingDays = DEFAULT_WORKING_DAYS) {
  let d = from;
  let left = n;
  let guard = 0;
  while (left > 0 && guard < 2000) {
    d = addDays(d, 1);
    if (isWorkingDay(d, workingDays)) left -= 1;
    guard += 1;
  }
  return d;
}

/* ------------------------------------------------------------ capacity */

export type LoadStatus = 'available' | 'balanced' | 'optimal' | 'warning' | 'over' | 'unset';

export interface MemberLoad {
  userId: string;
  capacityPts: number | null;
  assignedPts: number;
  inFlightPts: number;
  donePts: number;
  load: number | null;
  status: LoadStatus;
  hoursPerDay: number;
  role: string;
  skills: string[];
  pto: Set<string>;
  tasks: Task[];
  /** Planned hours per sprint day (null for weekends and PTO). */
  daily: (number | null)[];
  capacityHours: number;
  committedHours: number;
}

export function loadStatus(load: number | null, ceiling: number): LoadStatus {
  if (load === null) return 'unset';
  if (load > 1) return 'over';
  if (load > ceiling) return 'warning';
  if (load >= 0.75) return 'optimal';
  if (load >= 0.6) return 'balanced';
  return 'available';
}

export const LOAD_LABEL: Record<LoadStatus, string> = {
  available: 'Available',
  balanced: 'Balanced',
  optimal: 'Optimal',
  warning: 'Warning',
  over: 'Over capacity',
  unset: 'No capacity set',
};

/**
 * Per-member load for a sprint. Hours are planned, not logged: each open task's points are converted
 * to hours with the member's own rate (hours available ÷ capacity points) and spread over the working
 * days the task covers inside the sprint (or the remaining sprint days when it has no dates).
 */
export function memberLoads(members: string[], tasks: Task[], days: Date[], capacity: BoardCapacity | null | undefined): MemberLoad[] {
  const working = capacity?.working_days?.length ? capacity.working_days : DEFAULT_WORKING_DAYS;
  const ceiling = capacity?.policy?.safety_ceiling ?? 0.85;
  return members.map((userId) => {
    const cfg: MemberCapacity = capacity?.members?.[userId] ?? {};
    const pto = new Set(cfg.pto ?? []);
    const mine = tasks.filter((t) => t.assignees[0] === userId);
    const assignedPts = sum(mine.map((t) => t.points ?? 0));
    const donePts = sum(mine.filter((t) => t.statusCategory === 'done').map((t) => t.points ?? 0));
    const inFlightPts = sum(mine.filter((t) => t.statusCategory === 'in_progress' || t.statusCategory === 'review' || t.statusCategory === 'blocked').map((t) => t.points ?? 0));
    const capacityPts = typeof cfg.capacity_pts === 'number' && cfg.capacity_pts > 0 ? cfg.capacity_pts : null;
    const hoursPerDay = cfg.hours_per_day ?? 8;
    const availableDays = days.filter((d) => isWorkingDay(d, working) && !pto.has(toDateKey(d)));
    const capacityHours = availableDays.length * hoursPerDay;
    const hoursPerPoint = capacityPts ? capacityHours / capacityPts : hoursPerDay / 2;

    const daily: (number | null)[] = days.map((d) => (isWorkingDay(d, working) && !pto.has(toDateKey(d)) ? 0 : null));
    for (const t of mine) {
      if (t.statusCategory === 'done') continue;
      const hours = (t.points ?? 1) * hoursPerPoint;
      const span = days
        .map((d, i) => ({ d, i }))
        .filter(({ d, i }) => daily[i] !== null && (!t.start || d >= startOfDay(t.start)) && (!t.due || d <= startOfDay(t.due)));
      const slots = span.length ? span : days.map((d, i) => ({ d, i })).filter(({ i }) => daily[i] !== null);
      if (!slots.length) continue;
      for (const { i } of slots) daily[i] = (daily[i] ?? 0) + hours / slots.length;
    }
    const load = capacityPts ? assignedPts / capacityPts : null;
    return {
      userId,
      capacityPts,
      assignedPts,
      inFlightPts,
      donePts,
      load,
      status: loadStatus(load, ceiling),
      hoursPerDay,
      role: cfg.role ?? '',
      skills: cfg.skills ?? [],
      pto,
      tasks: mine,
      daily: daily.map((h) => (h === null ? null : round1(h))),
      capacityHours,
      committedHours: round1(assignedPts * hoursPerPoint),
    };
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface Rebalance {
  task: Task;
  from: MemberLoad;
  to: MemberLoad;
  points: number;
}

/**
 * Suggests moving one open, unlocked task from the most loaded member above the safety ceiling to the
 * member with the most runway, choosing the largest task that keeps the receiver under the ceiling.
 * Prefers receivers whose skills match the task's labels.
 */
export function recommendRebalance(loads: MemberLoad[], ceiling = 0.85): Rebalance | null {
  const withCap = loads.filter((l) => l.capacityPts);
  const donors = withCap.filter((l) => (l.load ?? 0) > ceiling).sort((a, b) => (b.load ?? 0) - (a.load ?? 0));
  for (const from of donors) {
    const candidates = from.tasks
      .filter((t) => !t.locked && t.statusCategory !== 'done' && (t.points ?? 0) > 0 && t.priority !== 'urgent')
      .sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
    const receivers = withCap.filter((l) => l.userId !== from.userId).sort((a, b) => (a.load ?? 0) - (b.load ?? 0));
    const options: (Rebalance & { skill: boolean })[] = [];
    for (const task of candidates) {
      for (const to of receivers) {
        const after = (to.assignedPts + (task.points ?? 0)) / (to.capacityPts ?? 1);
        if (after > ceiling) continue;
        const skills = to.skills.map((x) => x.toLowerCase());
        options.push({ task, from, to, points: task.points ?? 0, skill: task.labels.some((l) => skills.includes(l.toLowerCase())) });
      }
    }
    // Biggest relief first, then a skill match, then the receiver with the most runway.
    options.sort((x, y) => y.points - x.points || Number(y.skill) - Number(x.skill) || (x.to.load ?? 0) - (y.to.load ?? 0));
    const best = options[0] ? { task: options[0].task, from, to: options[0].to, points: options[0].points } : null;
    if (best) return best;
  }
  return null;
}

export { parseDate, toDateKey };
