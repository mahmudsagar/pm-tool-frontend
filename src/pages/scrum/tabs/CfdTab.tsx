import { useMemo, useState } from 'react';
import { ArrowRight, Download, Gauge, Hourglass, Sigma, Timer, Waves, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { toDateKey, type StatusCategory } from '@/features/board/model';
import { useScrum } from '@/features/scrum/scrumContext';
import { trimLeadingEmpty, useAnalytics } from '@/features/scrum/api';
import { addDays, isWorkingDay, mean, monteCarlo, percentile, round1, sum, variance } from '@/features/scrum/analytics';
import { EmptyNote, KpiRow, KpiTile, Panel } from '@/features/scrum/KpiTile';
import { LegendChip, XYChart } from '@/features/scrum/charts';
import { areaPath, stepPath } from '@/features/scrum/chartUtils';

type Range = 'sprint' | '30' | '60' | '90';
type Unit = 'points' | 'issues';

const BANDS: { key: StatusCategory | 'wip'; label: string; fill: string; swatch: string; cats: StatusCategory[] }[] = [
  { key: 'done', label: 'Done', fill: 'fill-success/70', swatch: 'bg-success/70', cats: ['done'] },
  { key: 'review', label: 'Review & QA', fill: 'fill-warning/70', swatch: 'bg-warning/70', cats: ['review'] },
  { key: 'in_progress', label: 'In progress', fill: 'fill-brand/70', swatch: 'bg-brand/70', cats: ['in_progress', 'blocked'] },
  { key: 'todo', label: 'To do', fill: 'fill-muted-foreground/40', swatch: 'bg-muted-foreground/40', cats: ['todo'] },
  { key: 'backlog', label: 'Backlog', fill: 'fill-violet-500/40', swatch: 'bg-violet-500/40', cats: ['backlog'] },
];

const STAGE_LABEL: Record<StatusCategory, string> = { backlog: 'Backlog', todo: 'To do', in_progress: 'In progress', review: 'Review & QA', blocked: 'Blocked', done: 'Done' };

export default function CfdTab() {
  const { sprint, analytics: sprintAnalytics, window, setTab } = useScrum();
  const { board } = useBoard();
  const [range, setRange] = useState<Range>(sprint && sprint.status !== 'planned' ? 'sprint' : '30');
  const [unit, setUnit] = useState<Unit>('points');
  const [mode, setMode] = useState<'cumulative' | 'daily'>('cumulative');
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [opts, setOpts] = useState({ wip: true, lead: true, bottlenecks: true });

  const rangeParams = useMemo(() => {
    if (range === 'sprint') return null;
    const to = new Date();
    return { from: toDateKey(addDays(to, -Number(range) + 1)), to: toDateKey(to) };
  }, [range]);
  const rangeQuery = useAnalytics(board._id, rangeParams);
  const rangeData = useMemo(() => (rangeQuery.data ? trimLeadingEmpty(rangeQuery.data) : undefined), [rangeQuery.data]);
  const analytics = range === 'sprint' ? sprintAnalytics : rangeData;
  const loading = range === 'sprint' ? !sprintAnalytics : rangeQuery.isPending;

  const model = useMemo(() => {
    if (!analytics) return null;
    const byDate = new Map(analytics.daily.map((d) => [d.date, d]));
    const keys = analytics.days;
    const v = (d: (typeof analytics.daily)[number] | undefined, cats: StatusCategory[]) => (d ? sum(cats.map((c) => d.by_category[c]?.[unit] ?? 0)) : undefined);
    const bands = BANDS.filter((b) => !hidden.has(b.key)).map((b) => ({ ...b, values: keys.map((k) => v(byDate.get(k), b.cats)) }));
    const scope = keys.map((k) => {
      const d = byDate.get(k);
      return d ? (unit === 'points' ? d.scope_points : d.scope_issues) : undefined;
    });
    const wip = keys.map((k) => v(byDate.get(k), ['in_progress', 'review', 'blocked']));
    const throughput = analytics.flow.throughput.map((t) => (unit === 'points' ? t.points : t.issues));
    const lastIdx = keys.reduce<number>((acc, k, i) => (byDate.has(k) ? i : acc), -1);
    // Bottlenecks: days where in-flight work grew while nothing was finished.
    const bottleneckDays = keys
      .map((k, i) => ({ i, d: byDate.get(k), prev: i ? byDate.get(keys[i - 1]) : undefined }))
      .filter(({ d, prev }) => d && prev && (v(d, ['review', 'in_progress', 'blocked']) ?? 0) > (v(prev, ['review', 'in_progress', 'blocked']) ?? 0) && d.completed.length === 0)
      .map(({ i }) => i);
    return { keys, bands, scope, wip, throughput, lastIdx, bottleneckDays };
  }, [analytics, unit, hidden]);

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted/40" />;
  if (!analytics || !model) return <EmptyNote>No flow data for this range yet.</EmptyNote>;

  const u = unit === 'points' ? 'pts' : 'issues';
  const cycle = analytics.flow.cycle_times.map((c) => c.days);
  const lead = analytics.flow.lead_times.map((c) => c.days);
  const avgCycle = cycle.length ? round1(mean(cycle)) : null;
  const avgLead = lead.length ? round1(mean(lead)) : null;
  const efficiency = avgCycle !== null && avgLead ? round1((avgCycle / avgLead) * 100) : null;
  const wipNow = model.lastIdx >= 0 ? (model.wip[model.lastIdx] ?? 0) : 0;
  const avgWip = round1(mean(model.wip.filter((x): x is number => x !== undefined)));
  const wipLimit = ((board.saved_view as { scrum?: { wip_points_limit?: number | null } } | null)?.scrum?.wip_points_limit ?? null) || null;
  const workingThroughput = analytics.flow.throughput.filter((t) => isWorkingDay(new Date(`${t.date}T00:00:00`))).map((t) => (unit === 'points' ? t.points : t.issues));
  const lambda = round1(mean(workingThroughput));
  const varTp = round1(variance(workingThroughput));
  const littleW = lambda > 0 ? round1(avgWip / lambda) : null;
  const remaining = model.lastIdx >= 0 ? sum(['todo', 'in_progress', 'review', 'blocked'].map((c) => analytics.daily.find((d) => d.date === model.keys[model.lastIdx])?.by_category[c as StatusCategory]?.[unit] ?? 0)) : 0;
  const daysLeft = window ? window.days.filter((d, i) => i > Math.max(0, window.elapsed) && isWorkingDay(d)).length : 0;
  const prob = range === 'sprint' && window ? monteCarlo(workingThroughput, remaining, daysLeft, 2000, 11).probability : null;
  const stable = littleW !== null && avgCycle !== null && Math.abs(littleW - avgCycle) <= Math.max(1, avgCycle * 0.35);
  const maxY = Math.max(1, ...model.keys.map((_, i) => sum(model.bands.map((b) => b.values[i] ?? 0))), ...model.scope.filter((x): x is number => x !== undefined));
  const fmtDay = (k: string) => new Date(`${k}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const todayIdx = model.keys.indexOf(toDateKey(new Date()));
  const latest = analytics.daily[analytics.daily.length - 1];

  const exportCsv = () => {
    const rows = [['Date', ...BANDS.map((b) => b.label), 'Scope'], ...model.keys.map((k, i) => [k, ...BANDS.map((b) => String(sum(b.cats.map((c) => analytics.daily.find((d) => d.date === k)?.by_category[c]?.[unit] ?? 0)))), String(model.scope[i] ?? '')])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `${board.name} flow.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          size="sm"
          aria-label="Range"
          value={range}
          onValueChange={setRange}
          options={[...(sprint && sprint.status !== 'planned' ? [{ value: 'sprint' as Range, label: sprint.name }] : []), { value: '30', label: '30D' }, { value: '60', label: '60D' }, { value: '90', label: '90D' }]}
        />
        <SegmentedControl size="sm" aria-label="Unit" value={unit} onValueChange={setUnit} options={[{ value: 'points', label: 'Story points' }, { value: 'issues', label: 'Issues' }]} />
        <SegmentedControl size="sm" aria-label="Mode" value={mode} onValueChange={setMode} options={[{ value: 'cumulative', label: 'Cumulative' }, { value: 'daily', label: 'Daily throughput' }]} />
        <span className="ml-auto flex items-center gap-1.5 text-2xs text-muted-foreground">
          <Zap className="size-3 text-success-foreground" /> Throughput {lambda} {u}/day
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(
          [
            ['wip', 'WIP band'],
            ['lead', 'Lead time marker'],
            ['bottlenecks', 'Detect bottlenecks'],
          ] as [keyof typeof opts, string][]
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={opts[k]} onCheckedChange={(c) => setOpts({ ...opts, [k]: !!c })} /> {label}
          </label>
        ))}
        <Button variant="outline" size="xs" onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-subtle">Visible states:</span>
        {BANDS.map((b) => (
          <LegendChip
            key={b.key}
            label={b.label}
            swatch={b.swatch}
            active={!hidden.has(b.key)}
            value={latest ? `${sum(b.cats.map((c) => latest.by_category[c]?.[unit] ?? 0))} ${u}` : undefined}
            onClick={() =>
              setHidden((p) => {
                const n = new Set(p);
                if (n.has(b.key)) n.delete(b.key);
                else n.add(b.key);
                return n;
              })
            }
          />
        ))}
      </div>

      <KpiRow>
        <KpiTile label="Average lead time" icon={Hourglass} value={avgLead ?? '—'} unit={avgLead !== null ? 'days' : undefined}>
          <p>{lead.length ? `${lead.length} finished · P85 ${round1(percentile(lead, 85))}d` : 'Nothing finished in this range'}</p>
        </KpiTile>
        <KpiTile label="Average cycle time" icon={Timer} value={avgCycle ?? '—'} unit={avgCycle !== null ? 'days' : undefined}>
          <p>{cycle.length ? `P85: ${round1(percentile(cycle, 85))}d` : 'Start → done time appears once work finishes'}</p>
        </KpiTile>
        <KpiTile label="Flow efficiency" icon={Gauge} value={efficiency !== null ? `${efficiency}%` : '—'} tone={efficiency !== null && efficiency >= 40 ? 'good' : 'default'}>
          <p>Active time as a share of lead time</p>
        </KpiTile>
        <KpiTile label="WIP saturation" icon={Waves} value={wipNow} unit={wipLimit ? `${u} / ${wipLimit} limit` : `${u} in flight`} tone={wipLimit && wipNow > wipLimit ? 'bad' : 'default'}>
          {wipLimit ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', wipNow > wipLimit ? 'bg-danger' : 'bg-brand')} style={{ width: `${Math.min(100, (wipNow / wipLimit) * 100)}%` }} />
            </div>
          ) : (
            <button type="button" className="text-brand hover:underline" onClick={() => setTab('board')}>
              Set a WIP limit
            </button>
          )}
        </KpiTile>
        <KpiTile label="Work variance" icon={Sigma} value={varTp} unit="σ²">
          <span className={cn('inline-block rounded px-1.5 py-0.5', stable ? 'bg-success/10 text-success-foreground' : 'bg-warning/10 text-warning-foreground')}>{stable ? "Little's Law holds" : 'Flow is uneven'}</span>
        </KpiTile>
      </KpiRow>

      <Panel
        title={mode === 'cumulative' ? 'Cumulative flow' : 'Daily throughput'}
        subtitle={mode === 'cumulative' ? 'Band thickness is work in each state; the vertical gap between bands is WIP, the horizontal one is lead time.' : `${u === 'pts' ? 'Points' : 'Issues'} finished per day.`}
        actions={
          latest && (
            <span className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-2xs">
              {fmtDay(latest.date)}: <span className="text-success-foreground">{unit === 'points' ? latest.done_points : latest.done_issues} done</span> · <span className="text-brand">{wipNow} WIP</span> · {unit === 'points' ? latest.scope_points : latest.scope_issues} total
            </span>
          )
        }
      >
        {mode === 'cumulative' ? (
          <XYChart
            n={model.keys.length}
            yMax={maxY}
            height={360}
            highlightX={todayIdx >= 0 ? todayIdx : undefined}
            xLabel={(i) => (i === todayIdx ? 'Today' : fmtDay(model.keys[i]))}
            xLabelEvery={Math.max(1, Math.ceil(model.keys.length / 8))}
            ariaLabel="Cumulative flow diagram"
            tooltip={(i) => {
              const d = analytics.daily.find((x) => x.date === model.keys[i]);
              if (!d) return <p className="text-muted-foreground">{fmtDay(model.keys[i])}: no data yet</p>;
              const total = unit === 'points' ? d.scope_points : d.scope_issues;
              return (
                <div className="space-y-1">
                  <p className="flex justify-between font-medium">
                    {fmtDay(d.date)}
                    {model.bottleneckDays.includes(i) && opts.bottlenecks ? <span className="rounded bg-warning/15 px-1 text-2xs text-warning-foreground">Queue growing</span> : <span className="rounded bg-success/15 px-1 text-2xs text-success-foreground">Balanced</span>}
                  </p>
                  <p className="flex justify-between text-muted-foreground">
                    Total scope <span className="font-mono text-foreground">{total}</span>
                  </p>
                  {BANDS.map((b) => {
                    const val = sum(b.cats.map((c) => d.by_category[c]?.[unit] ?? 0));
                    return (
                      <p key={b.key} className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('size-2 rounded-full', b.swatch)} /> {b.label}
                        </span>
                        <span className="font-mono text-foreground">
                          {val}
                          {total ? ` (${Math.round((val / total) * 100)}%)` : ''}
                        </span>
                      </p>
                    );
                  })}
                </div>
              );
            }}
          >
            {(s) => {
              const n = model.keys.length;
              const upto = model.lastIdx;
              const base = Array.from({ length: n }, () => 0);
              const paths = model.bands.map((b) => {
                const lower = base.slice();
                const upper = base.map((acc, i) => acc + (b.values[i] ?? 0));
                upper.forEach((v, i) => (base[i] = v));
                const idx = Array.from({ length: Math.max(0, upto + 1) }, (_, i) => i);
                return { b, top: idx.map((i) => [s.x(i), s.y(upper[i])] as [number, number]), bottom: idx.map((i) => [s.x(i), s.y(lower[i])] as [number, number]) };
              });
              const scopePts = model.scope.map((v, i) => (v === undefined ? null : ([s.x(i), s.y(v)] as [number, number]))).filter(Boolean) as [number, number][];
              const doneBand = model.bands.find((b) => b.key === 'done');
              const leadPx = avgLead !== null ? (avgLead * (s.plotRight - s.plotLeft)) / Math.max(1, n - 1) : 0;
              const leadY = doneBand && upto >= 0 ? s.y((doneBand.values[upto] ?? 0) / 2 + 0.0001) : null;
              return (
                <>
                  {upto < n - 1 && upto >= 0 && <rect x={s.x(upto)} y={s.plotTop} width={s.plotRight - s.x(upto)} height={s.plotBottom - s.plotTop} className="fill-muted/40" />}
                  {paths.map(({ b, top, bottom }) => top.length > 1 && <path key={b.key} d={areaPath(top, bottom)} className={b.fill} />)}
                  {opts.wip && upto >= 0 && model.wip[upto] !== undefined && (
                    <line x1={s.x(upto)} x2={s.x(upto)} y1={s.y(sum(model.bands.filter((b) => b.key === 'done').map((b) => b.values[upto] ?? 0)))} y2={s.y(sum(model.bands.filter((b) => ['done', 'review', 'in_progress'].includes(b.key)).map((b) => b.values[upto] ?? 0)))} strokeWidth={3} className="stroke-foreground/60" />
                  )}
                  {scopePts.length > 0 && <path d={stepPath(scopePts)} fill="none" strokeWidth={2} className="stroke-violet-500" />}
                  {opts.lead && leadY !== null && avgLead !== null && upto >= 0 && (
                    <g>
                      <line x1={Math.max(s.plotLeft, s.x(upto) - leadPx)} x2={s.x(upto)} y1={leadY} y2={leadY} strokeDasharray="4 3" strokeWidth={1.5} className="stroke-warning" />
                      <text x={s.x(upto) - leadPx / 2} y={leadY - 6} textAnchor="middle" className="fill-warning-foreground font-mono text-[10px]">
                        Lead {avgLead}d
                      </text>
                    </g>
                  )}
                  {opts.bottlenecks &&
                    model.bottleneckDays.map((i) => <rect key={i} x={s.x(i) - 3} y={s.plotTop} width={6} height={4} rx={1} className="fill-warning" />)}
                </>
              );
            }}
          </XYChart>
        ) : (
          <XYChart
            n={analytics.flow.throughput.length}
            band
            yMax={Math.max(1, ...model.throughput)}
            height={300}
            xLabel={(i) => fmtDay(analytics.flow.throughput[i].date)}
            xLabelEvery={Math.max(1, Math.ceil(analytics.flow.throughput.length / 8))}
            ariaLabel="Daily throughput"
            tooltip={(i) => (
              <p>
                {fmtDay(analytics.flow.throughput[i].date)}: <span className="font-mono text-brand">{model.throughput[i]}</span> {u} finished
              </p>
            )}
          >
            {(s) => (
              <>
                {model.throughput.map((v, i) => (
                  <rect key={i} x={s.x(i) - Math.min(14, s.slot / 3)} y={s.y(v)} width={Math.min(28, (s.slot * 2) / 3)} height={s.plotBottom - s.y(v)} rx={2} className="fill-success/70" />
                ))}
                <line x1={s.plotLeft} x2={s.plotRight} y1={s.y(lambda)} y2={s.y(lambda)} strokeDasharray="4 3" className="stroke-warning" />
              </>
            )}
          </XYChart>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          {BANDS.map((b) => (
            <LegendChip key={b.key} label={b.label} swatch={b.swatch} />
          ))}
          <LegendChip label="Total scope" swatch="bg-violet-500" />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Stage transitions & queues" subtitle="Average time work waits before moving to the next stage.">
          {analytics.flow.stage_times.length === 0 ? (
            <EmptyNote>Stage times appear once issues move between states.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {analytics.flow.stage_times
                .filter((st) => st.count > 0)
                .map((st) => {
                  const status = st.avg_days <= 1 ? 'Optimal' : st.avg_days <= 2.5 ? 'Healthy' : 'Slow';
                  return (
                    <li key={`${st.from}-${st.to}`} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {STAGE_LABEL[st.from]} <ArrowRight className="size-3.5 text-subtle" /> {STAGE_LABEL[st.to]}
                        </span>
                        <span className="text-2xs text-muted-foreground">
                          Wait {round1(st.avg_days)} days on average · {st.count} moves
                        </span>
                      </span>
                      <span className="text-right">
                        <span className={cn('block rounded px-1.5 font-mono text-xs', status === 'Slow' ? 'bg-warning/15 text-warning-foreground' : 'bg-success/10 text-success-foreground')}>{round1(st.avg_days)}d</span>
                        <span className="text-2xs text-muted-foreground">{status}</span>
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </Panel>
        <Panel title="Little's Law & predictability" subtitle="WIP = throughput × cycle time, when flow is stable.">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-center">
            <div>
              <p className="text-2xs text-muted-foreground">Average WIP</p>
              <p className="font-mono text-lg font-semibold text-brand">{avgWip}</p>
            </div>
            <span className="text-muted-foreground">=</span>
            <div>
              <p className="text-2xs text-muted-foreground">Throughput λ</p>
              <p className="font-mono text-lg font-semibold text-success-foreground">{lambda}/d</p>
            </div>
            <span className="text-muted-foreground">×</span>
            <div>
              <p className="text-2xs text-muted-foreground">Cycle time W</p>
              <p className="font-mono text-lg font-semibold">{littleW ?? '—'}d</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {littleW === null
              ? 'Not enough finished work to check the law yet.'
              : stable
                ? `Predicted cycle time (${littleW}d) matches the measured ${avgCycle}d, so delivery dates from throughput are reliable.`
                : `Predicted cycle time (${littleW}d) differs from the measured ${avgCycle ?? '—'}d. WIP is ${avgCycle !== null && littleW > avgCycle ? 'piling up; finish work before starting more' : 'draining faster than it builds'}.`}
          </p>
          {prob !== null && (
            <p className="mt-3 rounded-lg border border-border p-3 text-xs">
              <span className="font-medium">Delivery probability:</span> <span className="font-mono text-success-foreground">{Math.round(prob * 100)}%</span> chance of finishing the remaining {remaining} {u} in {daysLeft} working days.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="xs" onClick={() => setTab('board')}>
              Adjust WIP limit
            </Button>
            <Button variant="brand" size="xs" onClick={exportCsv}>
              <Download /> Export flow CSV
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
