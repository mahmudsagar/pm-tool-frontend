import { useMemo, useState } from 'react';
import { Activity, CircleMinus, CirclePlus, Copy, Download, Gauge, Sparkles, Target, Timer, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import type { Task } from '@/features/board/model';
import { useScrum } from '@/features/scrum/scrumContext';
import { addWorkingDays, idealLine, isWorkingDay, mean, monteCarlo, percentile, rollingAvg, round1, sum } from '@/features/scrum/analytics';
import { EmptyNote, KpiRow, KpiTile, Panel } from '@/features/scrum/KpiTile';
import { LegendChip, XYChart } from '@/features/scrum/charts';
import { areaPath, linePath, SERIES, stepPath } from '@/features/scrum/chartUtils';

type Unit = 'points' | 'issues';

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function BurndownTab() {
  const { analytics, analyticsLoading, sprint, window, sprintTasks, team } = useScrum();
  const { board } = useBoard();
  const { toast } = useToast();
  const [unit, setUnit] = useState<Unit>('points');
  const [show, setShow] = useState({ ideal: true, actual: true, scope: true, cone: true });

  const model = useMemo(() => {
    if (!analytics || !window) return null;
    const byDate = new Map(analytics.daily.map((d) => [d.date, d]));
    const days = window.days;
    const keys = analytics.days;
    const remaining = keys.map((k) => {
      const d = byDate.get(k);
      return d ? (unit === 'points' ? d.remaining_points : d.remaining_issues) : undefined;
    });
    const scope = keys.map((k) => {
      const d = byDate.get(k);
      return d ? (unit === 'points' ? d.scope_points : d.scope_issues) : undefined;
    });
    const committed = unit === 'points' ? (sprint?.committed?.points ?? scope.find((v) => v !== undefined) ?? 0) : (sprint?.committed?.issues ?? scope.find((v) => v !== undefined) ?? 0);
    const ideal = idealLine(days, committed);
    const lastIdx = remaining.reduce<number>((acc, v, i) => (v !== undefined ? i : acc), -1);
    const nowRemaining = lastIdx >= 0 ? (remaining[lastIdx] as number) : committed;
    const nowScope = lastIdx >= 0 ? (scope[lastIdx] as number) : committed;

    // Daily throughput on working days so far; older sprints fill in when there is little history.
    const samples = analytics.daily
      .filter((d) => isWorkingDay(new Date(`${d.date}T00:00:00`)))
      .map((d) => (unit === 'points' ? sum(d.completed.map((c) => c.points)) : d.completed.length));
    const past = analytics.velocity.filter((v) => v.status === 'closed');
    const pastPerDay = past.map((v) => (unit === 'points' ? v.completed_points : v.completed_issues) / Math.max(1, days.filter((d) => isWorkingDay(d)).length));
    const pool = samples.length >= 3 ? samples : [...samples, ...pastPerDay];
    const workLeft = days.filter((d, i) => i > Math.max(0, window.elapsed) && isWorkingDay(d)).length;
    const forecast = monteCarlo(pool, nowRemaining, workLeft, 2000, board._id.length + days.length);
    const runRate = round1(mean(samples));
    const targetRate = round1(committed / Math.max(1, days.filter((d) => isWorkingDay(d)).length));
    const finishDate = Number.isFinite(forecast.p50) ? addWorkingDays(window.today, forecast.p50) : null;
    const idealNow = ideal[Math.max(0, Math.min(ideal.length - 1, window.elapsed))];
    return { days, keys, remaining, scope, committed, ideal, lastIdx, nowRemaining, nowScope, forecast, runRate, targetRate, finishDate, workLeft, idealNow, samples };
  }, [analytics, window, sprint, unit, board._id]);

  const velocity = useMemo(() => {
    const rows = (analytics?.velocity ?? []).slice(-6);
    const completed = rows.map((r) => (unit === 'points' ? r.completed_points : r.completed_issues));
    return { rows, completed, committed: rows.map((r) => (unit === 'points' ? r.committed_points : r.committed_issues)), rolling: rollingAvg(completed, 3) };
  }, [analytics, unit]);

  const epics = useMemo(() => {
    const map = new Map<string, Task[]>();
    sprintTasks.forEach((t) => map.set(t.epic || 'No epic', [...(map.get(t.epic || 'No epic') ?? []), t]));
    return Array.from(map.entries())
      .map(([name, list]) => ({
        name,
        total: unit === 'points' ? sum(list.map((t) => t.points ?? 0)) : list.length,
        done: unit === 'points' ? sum(list.filter((t) => t.statusCategory === 'done').map((t) => t.points ?? 0)) : list.filter((t) => t.statusCategory === 'done').length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sprintTasks, unit]);

  if (!sprint) return <EmptyNote>Pick a sprint to see its burndown.</EmptyNote>;
  if (sprint.status === 'planned') return <EmptyNote>{sprint.name} hasn&apos;t started. The burndown begins on its first day.</EmptyNote>;
  if (analyticsLoading || !analytics) return <div className="h-96 animate-pulse rounded-xl bg-muted/40" />;
  if (!model || !window) return <EmptyNote>This sprint has no dates, so there&apos;s no burndown to draw. Edit the sprint to add them.</EmptyNote>;

  const u = unit === 'points' ? 'pts' : 'issues';
  const ahead = round1(model.idealNow - model.nowRemaining);
  const churn = analytics.churn;
  const added = sum(churn.filter((c) => c.delta_points > 0).map((c) => c.delta_points));
  const removed = sum(churn.filter((c) => c.delta_points < 0).map((c) => -c.delta_points));
  const net = added - removed;
  const churnPct = model.committed ? round1((Math.abs(net) / model.committed) * 100) : 0;
  const cycle = analytics.flow.cycle_times.map((c) => c.days);
  const lead = analytics.flow.lead_times.map((c) => c.days);
  const doneNow = model.nowScope - model.nowRemaining;
  const prev = velocity.rows.length > 1 ? velocity.completed[velocity.completed.length - 2] : null;
  const vDelta = prev ? Math.round(((doneNow - prev) / Math.max(1, prev)) * 100) : null;
  const conf = Math.round(model.forecast.probability * 100);
  const capPts = sum(Object.values(board.capacity?.members ?? {}).map((c) => c.capacity_pts ?? 0));
  const yMax = Math.max(model.committed, ...model.scope.filter((v): v is number => v !== undefined), 1);
  const endDiff = model.finishDate ? Math.round((window.end.getTime() - model.finishDate.getTime()) / 86_400_000) : null;

  const synthesis = [
    model.nowRemaining <= 0
      ? `All committed work is done.`
      : model.finishDate
        ? `At the current pace the remaining ${model.nowRemaining} ${u} finish around ${fmtDate(model.finishDate)}${endDiff !== null ? (endDiff >= 0 ? `, ${endDiff} day${endDiff === 1 ? '' : 's'} before the sprint ends` : `, ${-endDiff} day${endDiff === -1 ? '' : 's'} after it ends`) : ''}.`
        : `Nothing has been finished yet, so there's no pace to forecast from.`,
    ahead >= 0 ? `The team is ${ahead} ${u} ahead of the ideal line.` : `The team is ${-ahead} ${u} behind the ideal line.`,
    net > 0 ? `Scope grew by ${net} ${u} since the sprint started (${churnPct}%).` : net < 0 ? `Scope shrank by ${-net} ${u} since the start.` : 'Scope has not changed since the start.',
    sprintTasks.some((t) => t.blocked && t.statusCategory !== 'done') ? `${sprintTasks.filter((t) => t.blocked && t.statusCategory !== 'done').length} blocked issue(s) need attention.` : '',
    churnPct > 10 ? 'Churn is above the 10% healthy threshold; consider holding new work for the next sprint.' : '',
  ].filter(Boolean);

  const exportCsv = () => {
    const rows = [['Date', 'Ideal', 'Remaining', 'Scope'], ...model.keys.map((k, i) => [k, String(model.ideal[i] ?? ''), String(model.remaining[i] ?? ''), String(model.scope[i] ?? '')])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `${sprint.name} burndown.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl size="sm" aria-label="Unit" value={unit} onValueChange={setUnit} options={[{ value: 'points', label: 'Story points' }, { value: 'issues', label: 'Issues' }]} />
        <Button variant="outline" size="xs" onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
        <span className="ml-auto flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" /> Forecast from {model.samples.length} days of throughput · 2,000 simulations
        </span>
      </div>

      <KpiRow>
        <KpiTile label="Sprint velocity" icon={Gauge} value={doneNow} unit={u} delta={vDelta !== null ? { text: `${vDelta >= 0 ? '↗ +' : '↘ '}${vDelta}%`, tone: vDelta >= 0 ? 'good' : 'bad' } : undefined}>
          <p className="flex justify-between">
            <span>Committed: {model.committed} {u}</span>
            {velocity.rolling.length > 0 && <span>Rolling: {round1(velocity.rolling[velocity.rolling.length - 1])}</span>}
          </p>
        </KpiTile>
        <KpiTile label="Burndown pace" icon={TrendingDown} value={`${ahead >= 0 ? '−' : '+'}${Math.abs(ahead)}`} unit={`${u} ${ahead >= 0 ? 'ahead' : 'behind'}`} tone={ahead >= 0 ? 'good' : 'bad'}>
          <p>
            Day {Math.min(window.days.length, Math.max(1, window.elapsed + 1))} of {window.days.length} · {model.nowRemaining} {u} remaining
          </p>
        </KpiTile>
        <KpiTile label="Scope churn" icon={Activity} value={`${net >= 0 ? '+' : ''}${net}`} unit={`net ${u}`} tone={churnPct > 10 ? 'warn' : 'default'} delta={{ text: `${churnPct}% churn`, tone: churnPct > 10 ? 'bad' : 'neutral' }}>
          <p>
            +{added} added · −{removed} removed
          </p>
        </KpiTile>
        <KpiTile label="Cycle & lead time" icon={Timer} value={cycle.length ? round1(mean(cycle)) : '—'} unit={cycle.length ? 'days avg' : undefined}>
          <p>
            {cycle.length ? `P85: ${round1(percentile(cycle, 85))}d` : 'No finished issues yet'}
            {lead.length ? ` · Lead: ${round1(mean(lead))}d` : ''}
          </p>
        </KpiTile>
        <KpiTile label="Goal confidence" icon={Target} value={`${conf}%`} unit="chance" tone={conf >= 80 ? 'good' : conf >= 50 ? 'warn' : 'bad'}>
          <p>Finish by {fmtDate(window.end)} (simulated)</p>
        </KpiTile>
      </KpiRow>

      <Panel
        title={
          <span className="flex items-center gap-2">
            {sprint.name} burndown
            <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', ahead >= 0 ? 'bg-success/10 text-success-foreground' : 'bg-danger/10 text-danger-foreground')}>{ahead >= 0 ? 'Ahead of schedule' : 'Behind schedule'}</span>
          </span>
        }
        subtitle="Remaining work per day against the ideal line, with scope changes and a simulated forecast."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <LegendChip label="Ideal" swatch="border-t-2 border-dashed border-muted-foreground bg-transparent" active={show.ideal} onClick={() => setShow({ ...show, ideal: !show.ideal })} />
            <LegendChip label="Remaining" swatch="bg-brand" active={show.actual} onClick={() => setShow({ ...show, actual: !show.actual })} />
            <LegendChip label="Scope" swatch="bg-warning" active={show.scope} onClick={() => setShow({ ...show, scope: !show.scope })} />
            <LegendChip label="Forecast" swatch="bg-brand/30" active={show.cone} onClick={() => setShow({ ...show, cone: !show.cone })} />
          </div>
        }
      >
        <XYChart
          n={model.days.length}
          yMax={yMax}
          height={340}
          highlightX={window.elapsed >= 0 && window.elapsed < model.days.length ? window.elapsed : undefined}
          xLabel={(i) => (i === window.elapsed ? 'Today' : fmtDate(model.days[i]))}
          xLabelEvery={Math.max(1, Math.ceil(model.days.length / 7))}
          yFormat={(v) => `${Math.round(v)}`}
          ariaLabel={`${sprint.name} burndown chart`}
          tooltip={(i) => {
            const d = analytics.daily.find((x) => x.date === model.keys[i]);
            return (
              <div className="space-y-1.5">
                <p className="flex items-center justify-between font-medium">
                  Day {i + 1} · {fmtDate(model.days[i])}
                  {i === window.elapsed && <span className={cn('rounded px-1 text-2xs', ahead >= 0 ? 'bg-success/15 text-success-foreground' : 'bg-danger/15 text-danger-foreground')}>{Math.abs(ahead)} {u} {ahead >= 0 ? 'ahead' : 'behind'}</span>}
                </p>
                <p className="flex justify-between text-muted-foreground">
                  Ideal <span className="font-mono text-foreground">{model.ideal[i]}</span>
                </p>
                {model.remaining[i] !== undefined && (
                  <p className="flex justify-between text-muted-foreground">
                    Remaining <span className="font-mono text-brand">{model.remaining[i]}</span>
                  </p>
                )}
                {d && d.completed.length > 0 && (
                  <ul className="border-t border-border pt-1.5 text-2xs">
                    {d.completed.slice(0, 5).map((c) => (
                      <li key={c.task_id} className="truncate">
                        • <span className="font-mono">{c.key}</span> {c.title} <span className="text-success-foreground">{c.points}pt</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }}
        >
          {(s) => {
            const actual = model.remaining.map((v, i) => (v === undefined ? null : ([s.x(i), s.y(v)] as [number, number]))).filter(Boolean) as [number, number][];
            const scopePts = model.scope.map((v, i) => (v === undefined ? null : ([s.x(i), s.y(v)] as [number, number]))).filter(Boolean) as [number, number][];
            const start = Math.max(0, model.lastIdx);
            const cone = model.forecast.cone.slice(0, model.days.length - start - 1);
            const futureIdx = model.days.map((_, i) => i).filter((i) => i > start && isWorkingDay(model.days[i]));
            const coneTop: [number, number][] = [[s.x(start), s.y(model.nowRemaining)]];
            const coneBot: [number, number][] = [[s.x(start), s.y(model.nowRemaining)]];
            futureIdx.forEach((i, k) => {
              const c = cone[k];
              if (!c) return;
              coneTop.push([s.x(i), s.y(c[2])]);
              coneBot.push([s.x(i), s.y(c[0])]);
            });
            return (
              <>
                {show.cone && coneTop.length > 1 && <path d={areaPath(coneTop, coneBot)} className="fill-brand/15" />}
                {show.ideal && <path d={linePath(model.ideal.map((v, i) => [s.x(i), s.y(v)]))} fill="none" strokeDasharray="5 5" strokeWidth={1.5} className="stroke-muted-foreground/70" />}
                {show.scope && scopePts.length > 0 && <path d={stepPath(scopePts)} fill="none" strokeDasharray="4 3" strokeWidth={1.5} className="stroke-warning" />}
                {show.actual && actual.length > 1 && <path d={areaPath(actual, actual.map(([x]) => [x, s.plotBottom]))} className="fill-brand/10" />}
                {show.actual && <path d={linePath(actual)} fill="none" strokeWidth={2.25} className="stroke-brand" />}
                {show.actual && actual.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === actual.length - 1 ? 5 : 3} className={i === actual.length - 1 ? 'fill-card stroke-brand' : 'fill-brand'} strokeWidth={2} />)}
              </>
            );
          }}
        </XYChart>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <TrendingUp className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              <span className="font-medium">Daily burn:</span> {model.runRate} {u}/day (needed: {model.targetRate})
            </span>
          </p>
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <Target className="mt-0.5 size-4 shrink-0 text-success-foreground" />
            <span>
              <span className="font-medium">Predicted completion:</span> {model.nowRemaining <= 0 ? 'done' : model.finishDate ? `${fmtDate(model.finishDate)} (P85 ${fmtDate(addWorkingDays(window.today, model.forecast.p85))})` : 'not enough data'}
            </span>
          </p>
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <Timer className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <span>
              <span className="font-medium">Runway:</span> {model.workLeft} working {model.workLeft === 1 ? 'day' : 'days'} left · {team.length} {team.length === 1 ? 'person' : 'people'}
            </span>
          </p>
        </div>
      </Panel>

      <Panel title="Velocity & predictability" subtitle={`Committed vs completed over the last ${velocity.rows.length} sprints, with a 3-sprint rolling average.`}>
        {velocity.rows.length === 0 ? (
          <EmptyNote>Velocity appears after the first sprint is completed.</EmptyNote>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-3">
              <LegendChip label="Completed" swatch="bg-brand" />
              <LegendChip label="Committed" swatch="bg-muted-foreground/40" />
              <LegendChip label="Rolling avg" swatch="bg-warning" />
              {capPts > 0 && unit === 'points' && <LegendChip label={`Capacity ${capPts} pts`} swatch="border-t border-foreground/50 bg-transparent" />}
            </div>
            <XYChart
              n={velocity.rows.length}
              band
              yMax={Math.max(...velocity.committed, ...velocity.completed, unit === 'points' ? capPts : 0, 1)}
              height={240}
              xLabel={(i) => `${velocity.rows[i].name}${velocity.committed[i] ? ` · ${Math.round((velocity.completed[i] / velocity.committed[i]) * 100)}%` : ''}`}
              ariaLabel="Velocity chart"
              tooltip={(i) => (
                <div className="space-y-1">
                  <p className="font-medium">{velocity.rows[i].name}</p>
                  <p className="flex justify-between text-muted-foreground">
                    Completed <span className="font-mono text-brand">{velocity.completed[i]}</span>
                  </p>
                  <p className="flex justify-between text-muted-foreground">
                    Committed <span className="font-mono text-foreground">{velocity.committed[i]}</span>
                  </p>
                  <p className="flex justify-between text-muted-foreground">
                    Predictability <span className="font-mono">{velocity.committed[i] ? Math.round((velocity.completed[i] / velocity.committed[i]) * 100) : 0}%</span>
                  </p>
                </div>
              )}
            >
              {(s) => {
                const bw = Math.min(28, s.slot / 3);
                return (
                  <>
                    {velocity.rows.map((r, i) => (
                      <g key={r.sprint_id}>
                        {r.status === 'active' && <rect x={s.x(i) - s.slot / 2 + 4} y={s.plotTop} width={s.slot - 8} height={s.plotBottom - s.plotTop} rx={6} className="fill-brand/5" />}
                        <rect x={s.x(i) - bw - 2} y={s.y(velocity.committed[i])} width={bw} height={s.plotBottom - s.y(velocity.committed[i])} rx={3} className="fill-muted-foreground/30" />
                        <rect x={s.x(i) + 2} y={s.y(velocity.completed[i])} width={bw} height={s.plotBottom - s.y(velocity.completed[i])} rx={3} className="fill-brand" />
                      </g>
                    ))}
                    {capPts > 0 && unit === 'points' && <line x1={s.plotLeft} x2={s.plotRight} y1={s.y(capPts)} y2={s.y(capPts)} className="stroke-foreground/40" strokeWidth={1} />}
                    <path d={linePath(velocity.rolling.map((v, i) => [s.x(i), s.y(v)]))} fill="none" className="stroke-warning" strokeWidth={2} />
                  </>
                );
              }}
            </XYChart>
          </>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Mid-sprint scope churn" subtitle="Issues added, removed or resized after the sprint started." actions={<span className="rounded-full bg-warning/10 px-2 py-0.5 font-mono text-2xs text-warning-foreground">{net >= 0 ? '+' : ''}{net} pts net</span>}>
          {churn.length === 0 ? (
            <EmptyNote>No scope changes since the sprint started.</EmptyNote>
          ) : (
            <ul className="divide-y divide-border">
              {churn.slice(0, 12).map((c, i) => (
                <li key={`${c.task_id}-${i}`} className="flex items-start gap-3 py-2.5">
                  {c.kind === 'removed' ? <CircleMinus className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <CirclePlus className={cn('mt-0.5 size-4 shrink-0', c.kind === 'added' ? 'text-warning-foreground' : 'text-brand')} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-mono text-2xs text-muted-foreground">{c.key}</span> {c.title}
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      {c.kind === 'added' ? 'Added' : c.kind === 'removed' ? 'Removed' : 'Resized'} {fmtDate(new Date(c.at))}
                      {c.actor_name ? ` · ${c.actor_name}` : ''}
                      {c.reason ? ` · ${c.reason}` : ''}
                    </p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 font-mono text-2xs', c.delta_points > 0 ? 'bg-warning/10 text-warning-foreground' : 'bg-muted text-muted-foreground')}>
                    {c.delta_points > 0 ? '+' : ''}
                    {c.delta_points} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-2xs text-muted-foreground">Healthy sprints keep churn at or below 10% (this one: {churnPct}%).</p>
        </Panel>
        <Panel title="Epic completion" subtitle={`${unit === 'points' ? 'Points' : 'Issues'} completed per epic in this sprint.`}>
          {epics.length === 0 ? (
            <EmptyNote>No issues in this sprint.</EmptyNote>
          ) : (
            <ul className="space-y-3">
              {epics.map((e, i) => (
                <li key={e.name}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className={cn('size-2 rounded-full', SERIES[i % SERIES.length])} />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="font-mono text-2xs text-muted-foreground">
                      {e.done} / {e.total} {u}
                    </span>
                    <span className="w-9 text-right font-mono text-2xs">{e.total ? Math.round((e.done / e.total) * 100) : 0}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', SERIES[i % SERIES.length])} style={{ width: `${e.total ? (e.done / e.total) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="flex flex-wrap items-start gap-4 rounded-xl border border-brand/25 bg-brand/5 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Sprint summary
            {endDiff !== null && model.nowRemaining > 0 && (
              <span className={cn('rounded-full px-2 py-0.5 text-2xs font-medium', endDiff >= 0 ? 'bg-success/10 text-success-foreground' : 'bg-danger/10 text-danger-foreground')}>
                Predicted finish: {endDiff >= 0 ? `${endDiff} day${endDiff === 1 ? '' : 's'} early` : `${-endDiff} day${endDiff === -1 ? '' : 's'} late`}
              </span>
            )}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{synthesis.join(' ')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(`${sprint.name}: ${synthesis.join(' ')}`);
            toast({ title: 'Summary copied', description: 'Paste it into your retro notes.' });
          }}
        >
          <Copy /> Copy for retro
        </Button>
      </section>
    </div>
  );
}
