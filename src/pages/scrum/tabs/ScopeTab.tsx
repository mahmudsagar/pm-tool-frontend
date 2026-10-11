import { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CalendarClock, CheckCircle2, CircleDot, Flag, Layers, Plus, Target, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { findStatusOption, parseDate, type Task } from '@/features/board/model';
import { StatusPill, TaskTypeIcon } from '@/features/board/components/chips';
import { useScrum } from '@/features/scrum/scrumContext';
import { addDays, mulberry32, percentile, round1, sum } from '@/features/scrum/analytics';
import { EmptyNote, KpiRow, KpiTile, Panel } from '@/features/scrum/KpiTile';
import { SegmentedBar } from '@/features/scrum/charts';
import { SERIES } from '@/features/scrum/chartUtils';

type Unit = 'points' | 'progress' | 'issues';

interface Release {
  id: string;
  name: string;
  target_date: string;
  baseline_points: number;
  baseline_issues: number;
  baseline_at: string;
}

const pts = (xs: Task[]) => sum(xs.map((t) => t.points ?? 0));
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Sprints needed to finish `remaining`, sampled from past sprint velocities. */
function sprintsNeeded(velocities: number[], remaining: number, runs = 1000) {
  const usable = velocities.filter((v) => v > 0);
  if (remaining <= 0) return { p50: 0, p85: 0, p95: 0 };
  if (!usable.length) return null;
  const rand = mulberry32(7 + usable.length);
  const out: number[] = [];
  for (let r = 0; r < runs; r += 1) {
    let left = remaining;
    let n = 0;
    while (left > 0 && n < 100) {
      left -= usable[Math.floor(rand() * usable.length)];
      n += 1;
    }
    out.push(n);
  }
  return { p50: percentile(out, 50), p85: percentile(out, 85), p95: percentile(out, 95) };
}

function ReleaseDialog({ open, onOpenChange, onSave, totals }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (r: Release) => void; totals: { points: number; issues: number } }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New release target</DialogTitle>
          <DialogDescription>
            Today&apos;s scope ({totals.points} pts, {totals.issues} issues) becomes the baseline. Work added later counts as scope creep.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !date) return;
            onSave({ id: `rel-${Date.now().toString(36)}`, name: name.trim(), target_date: date, baseline_points: totals.points, baseline_issues: totals.issues, baseline_at: new Date().toISOString() });
            onOpenChange(false);
            setName('');
            setDate('');
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="rel-name">Name</Label>
            <Input id="rel-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="v2.4 Enterprise hardening" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rel-date">Target / freeze date</Label>
            <Input id="rel-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="brand" disabled={!name.trim() || !date}>
              Create release
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ScopeTab() {
  const { sprints, activeSprint, analytics, setTab } = useScrum();
  const { board, tasks, statuses, member, patchBoard, openTask, memberName } = useBoard();
  const [unit, setUnit] = useState<Unit>('points');
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [epicSel, setEpicSel] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'review' | 'done'>('all');

  const scrum = ((board.saved_view as { scrum?: Record<string, unknown> } | null)?.scrum ?? {}) as { releases?: Release[]; active_release?: string };
  const releases = scrum.releases ?? [];
  const release = releases.find((r) => r.id === scrum.active_release) ?? releases[releases.length - 1] ?? null;
  const saveScrum = (patch: Record<string, unknown>) => {
    const sv = (board.saved_view ?? {}) as Record<string, unknown>;
    patchBoard({ saved_view: { ...sv, scrum: { ...((sv.scrum as Record<string, unknown>) ?? {}), ...patch } } });
  };

  const top = useMemo(() => tasks.filter((t) => !t.parentId), [tasks]);
  const totalPts = pts(top);
  const donePts = pts(top.filter((t) => t.statusCategory === 'done'));
  const velocities = (analytics?.velocity ?? []).filter((v) => v.status === 'closed').map((v) => v.completed_points);
  const sprintLen = (() => {
    const s = activeSprint ?? sprints[sprints.length - 1];
    const a = parseDate(s?.start_date ?? null);
    const b = parseDate(s?.end_date ?? null);
    return a && b ? Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1 : 14;
  })();
  const anchor = parseDate(activeSprint?.end_date ?? null) ?? new Date();

  const epics = useMemo(() => {
    const byEpic = new Map<string, Task[]>();
    top.forEach((t) => t.epic && byEpic.set(t.epic, [...(byEpic.get(t.epic) ?? []), t]));
    const avgVel = velocities.length ? sum(velocities.slice(-3)) / Math.min(3, velocities.length) : 0;
    const openTotal = pts(top.filter((t) => t.statusCategory !== 'done')) || 1;
    return Array.from(byEpic.entries())
      .map(([name, list], i) => {
        const total = pts(list);
        const done = pts(list.filter((t) => t.statusCategory === 'done'));
        const remaining = total - done;
        // Epics get a share of team velocity proportional to their share of open work.
        const epicVel = avgVel * (remaining / openTotal);
        const sprintsLeft = remaining <= 0 ? 0 : epicVel > 0 ? Math.ceil(remaining / epicVel) : null;
        const finish = sprintsLeft === null ? null : sprintsLeft === 0 ? new Date() : addDays(anchor, (sprintsLeft - 1) * sprintLen);
        const blocked = list.some((t) => t.blocked && t.statusCategory !== 'done');
        const target = release ? parseDate(release.target_date) : null;
        const health = remaining <= 0 ? 'Done' : blocked ? 'Blocked' : finish && target ? (finish <= target ? 'On track' : 'At risk') : finish ? 'On track' : 'No forecast';
        const owners = new Map<string, number>();
        list.forEach((t) => t.assignees[0] && owners.set(t.assignees[0], (owners.get(t.assignees[0]) ?? 0) + (t.points ?? 1)));
        const owner = Array.from(owners.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        return { name, list, total, done, remaining, issues: list.length, doneIssues: list.filter((t) => t.statusCategory === 'done').length, finish, health, owner, color: i, sprintsLeft };
      })
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top, velocities.join(), release?.target_date, sprintLen, anchor.getTime()]);

  const unmapped = top.filter((t) => !t.epic && t.statusCategory !== 'done');
  const baseline = release?.baseline_points ?? totalPts;
  const creep = totalPts - baseline;
  const injected = release ? pts(top.filter((t) => t.createdAt && t.createdAt > release.baseline_at)) : 0;
  const remainingAll = totalPts - donePts;
  const sim = sprintsNeeded(velocities, remainingAll);
  const dateFor = (n: number) => addDays(anchor, Math.max(0, n - 1) * sprintLen);
  const target = release ? parseDate(release.target_date) : null;
  const p85Date = sim ? dateFor(sim.p85) : null;
  const bufferDays = target && p85Date ? Math.round((target.getTime() - p85Date.getTime()) / 86_400_000) : null;

  // Roadmap columns: two most recent closed sprints, the active one, then planned ones (up to 5).
  const columns = useMemo(() => {
    const closed = sprints.filter((s) => s.status === 'closed').slice(-2);
    const active = sprints.filter((s) => s.status === 'active');
    const planned = sprints.filter((s) => s.status === 'planned');
    return [...closed, ...active, ...planned].slice(0, 5);
  }, [sprints]);
  const colStart = columns.map((s) => parseDate(s.start_date ?? null));

  const selected = epics.find((e) => e.name === epicSel) ?? epics[0];
  const trace = (selected?.list ?? []).filter((t) => statusFilter === 'all' || t.statusCategory === statusFilter || (statusFilter === 'in_progress' && t.statusCategory === 'blocked'));
  const val = (p: number, issues: number) => (unit === 'issues' ? `${issues} issues` : `${p} pts`);
  const activeEpics = epics.filter((e) => e.remaining > 0);
  const counts = { on: activeEpics.filter((e) => e.health === 'On track').length, risk: activeEpics.filter((e) => e.health === 'At risk').length, blocked: activeEpics.filter((e) => e.health === 'Blocked').length };
  const bandwidth = activeSprint ? epics.map((e) => ({ ...e, sprintPts: pts(e.list.filter((t) => t.sprintId === activeSprint._id)) })).filter((e) => e.sprintPts > 0) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Flag /> {release ? release.name : 'No release target'}
              {release && <span className="font-mono text-2xs text-muted-foreground">· {release.target_date}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Releases</DropdownMenuLabel>
            {releases.map((r) => (
              <DropdownMenuItem key={r.id} onSelect={() => saveScrum({ active_release: r.id })}>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="font-mono text-2xs text-subtle">{r.target_date}</span>
              </DropdownMenuItem>
            ))}
            {releases.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={() => setReleaseOpen(true)}>
              <Plus /> New release target
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <SegmentedControl size="sm" aria-label="Unit" value={unit} onValueChange={setUnit} options={[{ value: 'points', label: 'Story points' }, { value: 'progress', label: 'Progress %' }, { value: 'issues', label: 'Issues' }]} />
        {target && (
          <span className="ml-auto flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            Release target <span className="rounded-full bg-warning/10 px-2 py-0.5 normal-case text-warning-foreground">● {fmt(target)}</span>
          </span>
        )}
      </div>

      <KpiRow>
        <KpiTile label="Overall scope completion" icon={Target} value={`${totalPts ? round1((donePts / totalPts) * 100) : 0}%`} unit={`${donePts} / ${totalPts} pts`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${totalPts ? (donePts / totalPts) * 100 : 0}%` }} />
          </div>
        </KpiTile>
        <KpiTile label="Epics in flight" icon={Boxes} value={activeEpics.length} unit="active">
          <p>
            {counts.on} on track · {counts.risk} at risk · {counts.blocked} blocked
          </p>
        </KpiTile>
        <KpiTile label="Scope creep" icon={TriangleAlert} value={`${creep >= 0 ? '+' : ''}${creep}`} unit="pts vs baseline" tone={baseline && creep / baseline > 0.1 ? 'warn' : 'default'}>
          <p>{release ? `Baseline ${baseline} pts · ${baseline ? round1((Math.abs(creep) / baseline) * 100) : 0}% change` : 'Create a release to set a baseline'}</p>
        </KpiTile>
        <KpiTile label="Projected delivery" icon={CalendarClock} value={p85Date ? fmt(p85Date) : '—'} unit={p85Date ? 'P85' : undefined} tone={bufferDays === null ? 'default' : bufferDays >= 0 ? 'good' : 'bad'}>
          <p>{!sim ? 'Needs a completed sprint for velocity' : bufferDays === null ? `${sim.p85} more sprint${sim.p85 === 1 ? '' : 's'}` : bufferDays >= 0 ? `${bufferDays} days ahead of the target` : `${-bufferDays} days after the target`}</p>
        </KpiTile>
        <KpiTile label="Unmapped scope" icon={AlertTriangle} value={unmapped.length} unit={`issues · ${pts(unmapped)} pts`} tone={unmapped.length ? 'warn' : 'good'}>
          <button type="button" className="text-brand hover:underline" onClick={() => setTab('backlog')}>
            Open issues without an epic →
          </button>
        </KpiTile>
      </KpiRow>

      <Panel
        title="Epic roadmap & delivery forecast"
        subtitle="Completed vs remaining per epic, with a forecast end from the team's recent velocity."
        actions={
          <div className="flex gap-3 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-brand/70" /> Completed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-muted" /> Remaining</span>
          </div>
        }
      >
        {epics.length === 0 ? (
          <EmptyNote>No epics yet. Set the Epic field on issues to group them into deliverables.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[46rem]">
              <div className="grid grid-cols-[17rem_1fr] border-b border-border pb-2 text-2xs uppercase tracking-wide text-subtle">
                <span>Epic</span>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, 1fr)` }}>
                  {columns.map((s) => (
                    <span key={s._id} className={cn('truncate px-1', s.status === 'active' && 'font-semibold text-warning-foreground')}>
                      {s.status === 'active' && '● '}
                      {s.name}
                      {s.start_date && <span className="ml-1 normal-case text-subtle">({fmt(parseDate(s.start_date)!)})</span>}
                    </span>
                  ))}
                  {columns.length === 0 && <span>Sprints</span>}
                </div>
              </div>
              {epics.map((e) => {
                const pctDone = e.total ? Math.round((e.done / e.total) * 100) : 0;
                const tone = e.health === 'At risk' || e.health === 'Blocked' ? 'bg-danger/60' : e.health === 'Done' ? 'bg-success/70' : `${SERIES[e.color % SERIES.length]} opacity-80`;
                const finishCol = e.finish ? colStart.reduce<number>((acc, d, i) => (d && e.finish! >= d ? i : acc), -1) : -1;
                return (
                  <button key={e.name} type="button" onClick={() => setEpicSel(e.name)} className={cn('grid w-full grid-cols-[17rem_1fr] items-center gap-0 border-b border-border/60 py-3 text-left hover:bg-accent/30', selected?.name === e.name && 'bg-brand/5')}>
                    <span className="min-w-0 pr-3">
                      <span className="flex items-center gap-2 text-2xs">
                        <span className={cn('rounded-full px-1.5 py-0.5 font-medium', e.health === 'On track' ? 'bg-brand/10 text-brand' : e.health === 'Done' ? 'bg-success/10 text-success-foreground' : e.health === 'No forecast' ? 'bg-muted text-muted-foreground' : 'bg-danger/10 text-danger-foreground')}>{e.health}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium">{e.name}</span>
                      <span className="block truncate text-2xs text-muted-foreground">
                        {e.owner ? `${memberName(e.owner)} · ` : ''}
                        {val(e.total, e.issues)} ({pctDone}%)
                      </span>
                    </span>
                    <span className="relative flex items-center gap-2">
                      <span className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                        <span className={cn('absolute inset-y-0 left-0 flex min-w-[6rem] items-center whitespace-nowrap rounded-md px-2 font-mono text-[10px] font-medium text-foreground', tone)} style={{ width: `${pctDone}%` }}>
                          {pctDone}% · {unit === 'issues' ? `${e.doneIssues} issues` : `${e.done} pts`}
                        </span>
                      </span>
                      <span className="w-32 shrink-0 text-right text-2xs">
                        {e.remaining <= 0 ? (
                          <span className="flex items-center justify-end gap-1 text-success-foreground">
                            <CheckCircle2 className="size-3" /> Done
                          </span>
                        ) : e.finish ? (
                          <span className={cn(e.health === 'At risk' ? 'text-danger-foreground' : 'text-muted-foreground')}>
                            {e.remaining} pts left · {finishCol >= 0 && columns[finishCol] ? columns[finishCol].name : fmt(e.finish)}
                          </span>
                        ) : (
                          <span className="text-subtle">{e.remaining} pts left</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Scope churn" subtitle={release ? `Against the ${release.name} baseline` : 'Set a release baseline to track churn'}>
          <p className="mb-2 flex justify-between text-xs">
            <span>
              Baseline: <span className="font-mono font-medium">{baseline} pts</span>
            </span>
            <span>
              Current: <span className="font-mono font-medium">{totalPts} pts</span> ({creep >= 0 ? '+' : ''}
              {creep})
            </span>
          </p>
          <SegmentedBar
            className="h-2.5"
            segments={[
              { key: 'planned', value: Math.max(0, baseline), className: 'bg-brand/70', label: 'Planned' },
              { key: 'injected', value: Math.max(0, injected), className: 'bg-warning', label: 'Added later' },
            ]}
          />
          <p className="mt-2 flex gap-3 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brand/70" /> Planned ({baseline})</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-warning" /> Added later (+{injected})</span>
          </p>
          {analytics && analytics.churn.length > 0 && (
            <ul className="mt-3 space-y-1.5 rounded-lg border border-border p-2 text-2xs">
              {analytics.churn.slice(0, 4).map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CircleDot className={cn('size-3', c.delta_points > 0 ? 'text-warning-foreground' : 'text-muted-foreground')} />
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span className="font-mono">{c.delta_points > 0 ? '+' : ''}{c.delta_points} pts</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Slippage risk" subtitle="1,000 simulations over past sprint velocity">
          {!sim ? (
            <EmptyNote>Complete a sprint to forecast delivery.</EmptyNote>
          ) : (
            <ul className="space-y-3 text-xs">
              {(
                [
                  ['P50 · likely', sim.p50],
                  ['P85 · recommended', sim.p85],
                  ['P95 · conservative', sim.p95],
                ] as [string, number][]
              ).map(([label, n], i) => {
                const d = dateFor(n);
                const late = target ? d > target : false;
                return (
                  <li key={label}>
                    <p className="mb-1 flex justify-between">
                      <span>{label}</span>
                      <span className={cn('font-mono font-medium', late ? 'text-danger-foreground' : 'text-foreground')}>
                        {fmt(d)} ({n} sprint{n === 1 ? '' : 's'})
                      </span>
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full rounded-full', late ? 'bg-danger/70' : i === 1 ? 'bg-brand' : 'bg-brand/50')} style={{ width: `${Math.min(100, (n / Math.max(1, sim.p95)) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
              {counts.blocked > 0 && (
                <li className="flex items-start gap-2 rounded-lg bg-danger/10 p-2 text-2xs text-danger-foreground">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {counts.blocked} epic{counts.blocked === 1 ? ' has' : 's have'} blocked work on the critical path.
                </li>
              )}
            </ul>
          )}
        </Panel>
        <Panel title="Bandwidth distribution" subtitle={activeSprint ? `${activeSprint.name} load by epic` : 'No active sprint'}>
          {bandwidth.length === 0 ? (
            <EmptyNote>No epic work in the active sprint.</EmptyNote>
          ) : (
            <>
              <SegmentedBar className="h-2.5" segments={bandwidth.map((e) => ({ key: e.name, value: e.sprintPts, className: SERIES[e.color % SERIES.length], label: e.name }))} />
              <ul className="mt-3 grid grid-cols-2 gap-2 text-2xs">
                {bandwidth.map((e) => (
                  <li key={e.name} className="flex items-center gap-1.5 rounded border border-border p-2">
                    <span className={cn('size-2 rounded-full', SERIES[e.color % SERIES.length])} />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="font-mono">{Math.round((e.sprintPts / Math.max(1, sum(bandwidth.map((x) => x.sprintPts)))) * 100)}%</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="mt-3 text-2xs text-brand hover:underline" onClick={() => setTab('capacity')}>
                Rebalance allocation →
              </button>
            </>
          )}
        </Panel>
      </div>

      {selected && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" /> Deliverables: {selected.name}
            </span>
          }
          subtitle={`${selected.doneIssues} of ${selected.issues} issues done`}
          actions={
            <SegmentedControl
              size="sm"
              aria-label="Status filter"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: `All (${selected.list.length})` },
                { value: 'in_progress', label: `In progress (${selected.list.filter((t) => t.statusCategory === 'in_progress' || t.statusCategory === 'blocked').length})` },
                { value: 'review', label: `Review (${selected.list.filter((t) => t.statusCategory === 'review').length})` },
                { value: 'done', label: `Done (${selected.list.filter((t) => t.statusCategory === 'done').length})` },
              ]}
            />
          }
        >
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="text-2xs uppercase tracking-wide text-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium">Issue</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium">Pts</th>
                  <th className="px-2 py-2 font-medium">Assignee</th>
                  <th className="px-2 py-2 font-medium">Sprint</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trace.map((t) => {
                  const u = t.assignees[0] ? member(t.assignees[0]) : undefined;
                  const sp = sprints.find((s) => s._id === t.sprintId);
                  const st = findStatusOption(statuses, t.status);
                  return (
                    <tr key={t.id} className="cursor-pointer border-b border-border/60 hover:bg-accent/40" onClick={() => openTask(t.id)}>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <TaskTypeIcon task={t} />
                          <span className="font-mono text-2xs text-subtle">{t.key}</span>
                          <span className="truncate">{t.title}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5 capitalize text-muted-foreground">{t.type || '—'}</td>
                      <td className="px-2 py-2.5 font-mono">{t.points ?? '–'}</td>
                      <td className="px-2 py-2.5">{u ? <span className="flex items-center gap-1.5"><UserAvatar user={u} size="xs" /> {u.name}</span> : <span className="text-subtle">Unassigned</span>}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">{sp?.name ?? 'Backlog'}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill label={st?.label ?? t.status} category={t.statusCategory} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {trace.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nothing in this state.</p>}
          </div>
          <p className="mt-3 text-2xs text-muted-foreground">
            {selected.list.length} linked issues · {selected.total} story points
          </p>
        </Panel>
      )}

      <ReleaseDialog open={releaseOpen} onOpenChange={setReleaseOpen} totals={{ points: totalPts, issues: top.length }} onSave={(r) => saveScrum({ releases: [...releases, r], active_release: r.id })} />
    </div>
  );
}
