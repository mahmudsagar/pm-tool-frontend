import { describe, expect, it } from 'vitest';
import { normalizeTasks, resolveFieldMap, type BoardField, type RawBoard } from '@/features/board/model';
import { addWorkingDays, dayRange, idealLine, memberLoads, monteCarlo, percentile, recommendRebalance, rollingAvg, sprintWindow, variance, workingDaysBetween } from './analytics';

const d = (s: string) => new Date(`${s}T00:00:00`);

describe('scrum analytics math', () => {
  it('percentiles, rolling averages and variance', () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([5, 1, 3, 2, 4], 100)).toBe(5);
    expect(rollingAvg([3, 6, 9, 12], 3)).toEqual([3, 4.5, 6, 9]);
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571, 2);
  });

  it('only burns on working days in the ideal line', () => {
    // Fri Jan 2 2026 → Tue Jan 6: Sat/Sun stay flat.
    const days = dayRange(d('2026-01-02'), d('2026-01-06'));
    expect(workingDaysBetween(days[0], days[4]).length).toBe(3);
    const ideal = idealLine(days, 30);
    expect(ideal[0]).toBe(30);
    expect(ideal[1]).toBe(ideal[2]);
    expect(ideal[1]).toBe(30);
    expect(ideal[3]).toBe(15);
    expect(ideal[4]).toBe(0);
  });

  it('adds working days over weekends', () => {
    expect(addWorkingDays(d('2026-01-02'), 1).toDateString()).toBe(d('2026-01-05').toDateString());
  });

  it('describes a sprint window relative to today', () => {
    const w = sprintWindow({ start_date: '2026-03-02', end_date: '2026-03-13' }, d('2026-03-05'))!;
    expect(w.days.length).toBe(12);
    expect(w.elapsed).toBe(3);
    expect(w.daysLeft).toBe(8);
    expect(sprintWindow({ start_date: null, end_date: '2026-03-13' })).toBeNull();
  });
});

describe('monte carlo', () => {
  it('is deterministic and sensible', () => {
    const a = monteCarlo([5, 5, 5], 10, 3, 500, 1);
    const b = monteCarlo([5, 5, 5], 10, 3, 500, 1);
    expect(a).toEqual(b);
    expect(a.p50).toBe(2);
    expect(a.probability).toBe(1);
    expect(a.cone[0]).toEqual([5, 5, 5]);
  });

  it('handles no throughput and finished work', () => {
    expect(monteCarlo([0, 0], 10, 5).probability).toBe(0);
    expect(monteCarlo([], 10, 5).p50).toBe(Infinity);
    expect(monteCarlo([3], 0, 5).probability).toBe(1);
  });

  it('gets less confident with less time', () => {
    const plenty = monteCarlo([0, 2, 4, 6], 20, 15, 1000, 3).probability;
    const tight = monteCarlo([0, 2, 4, 6], 20, 4, 1000, 3).probability;
    expect(plenty).toBeGreaterThan(tight);
  });
});

describe('capacity', () => {
  const FIELDS: BoardField[] = [
    { type: 'select', label: 'Status', name: 'status' },
    { type: 'dynamic-select', label: 'Assignee', name: 'assignee' },
    { type: 'number', label: 'Story points', name: 'story_points' },
    { type: 'labels', label: 'Tags', name: 'labels' },
  ];
  const board: RawBoard = {
    _id: 'b',
    name: 'B',
    user_id: 'u',
    custom_meta: { fields: FIELDS },
    documents: [
      { _id: 't1', title: 'Big', custom_meta: { values: { status: 'todo', assignee: 'alex', story_points: 8 } } },
      { _id: 't2', title: 'Small', custom_meta: { values: { status: 'todo', assignee: 'alex', story_points: 3, labels: 'security' } } },
      { _id: 't3', title: 'Done', custom_meta: { values: { status: 'done', assignee: 'alex', story_points: 2 } } },
      { _id: 't4', title: 'Locked', locked: true, custom_meta: { values: { status: 'todo', assignee: 'alex', story_points: 1 } } },
      { _id: 't5', title: 'Sara work', custom_meta: { values: { status: 'in progress', assignee: 'sara', story_points: 4 } } },
    ],
  };
  const tasks = normalizeTasks(board, resolveFieldMap(FIELDS));
  // Mon Mar 2 – Fri Mar 6 2026: 5 working days.
  const days = dayRange(d('2026-03-02'), d('2026-03-06'));
  const capacity = {
    members: { alex: { capacity_pts: 14, hours_per_day: 8 }, sara: { capacity_pts: 12, hours_per_day: 6, pto: ['2026-03-04'], skills: ['Security'] } },
    policy: { safety_ceiling: 0.85 },
  };

  it('computes load, hours and PTO', () => {
    const [alex, sara] = memberLoads(['alex', 'sara'], tasks, days, capacity);
    expect(alex.assignedPts).toBe(14);
    expect(alex.load).toBe(1);
    expect(alex.status).toBe('warning');
    expect(alex.capacityHours).toBe(40);
    expect(sara.capacityHours).toBe(24);
    expect(sara.daily[2]).toBeNull();
    expect(sara.inFlightPts).toBe(4);
    // Open work spread evenly over available days (done tasks excluded).
    const planned = alex.daily.reduce<number>((s, h) => s + (h ?? 0), 0);
    expect(planned).toBeCloseTo((12 * 40) / 14, 0);
  });

  it('recommends the biggest move that keeps the receiver under the ceiling, never locked work', () => {
    const loads = memberLoads(['alex', 'sara'], tasks, days, capacity);
    const rec = recommendRebalance(loads, 0.85)!;
    expect(rec.from.userId).toBe('alex');
    expect(rec.to.userId).toBe('sara');
    // 8 pts would push Sara to 100%; 3 pts keeps her at 58%.
    expect(rec.task.id).toBe('t2');
    expect(recommendRebalance(memberLoads(['sara'], tasks, days, capacity))).toBeNull();
  });
});
