import { useMemo, useState } from 'react';
import { ArrowLeftRight, BatteryCharging, CalendarOff, Download, Gauge, Lightbulb, Plus, Scale, Settings2, ShieldCheck, UserPlus, UserRound, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { toDateKey, type BoardCapacity, type MemberCapacity } from '@/features/board/model';
import { useScrum } from '@/features/scrum/scrumContext';
import { useReassign, useSaveCapacity } from '@/features/scrum/api';
import { DEFAULT_WORKING_DAYS, isWorkingDay, LOAD_LABEL, memberLoads, recommendRebalance, round1, sum, type MemberLoad } from '@/features/scrum/analytics';
import { EmptyNote, KpiRow, KpiTile, Panel } from '@/features/scrum/KpiTile';
import { RebalanceDialog } from '@/features/scrum/RebalanceDialog';
import { SegmentedBar, Ring } from '@/features/scrum/charts';
import { SERIES } from '@/features/scrum/chartUtils';

type Unit = 'points' | 'hours';

const STATUS_TONE: Record<string, string> = {
  over: 'text-danger-foreground',
  warning: 'text-warning-foreground',
  optimal: 'text-brand',
  balanced: 'text-foreground',
  available: 'text-success-foreground',
  unset: 'text-subtle',
};

/* ------------------------------------------------------ capacity editor */

function CapacityEditor({ userId, capacity, onSave, trigger }: { userId: string; capacity: BoardCapacity; onSave: (next: BoardCapacity) => void; trigger: React.ReactNode }) {
  const cfg = capacity.members?.[userId] ?? {};
  const [draft, setDraft] = useState<MemberCapacity>(cfg);
  const [skills, setSkills] = useState((cfg.skills ?? []).join(', '));
  const [pto, setPto] = useState('');
  const save = () =>
    onSave({
      ...capacity,
      members: {
        ...(capacity.members ?? {}),
        [userId]: { ...draft, skills: skills.split(',').map((s) => s.trim()).filter(Boolean) },
      },
    });
  return (
    <Popover
      onOpenChange={(o) => {
        if (o) {
          setDraft(cfg);
          setSkills((cfg.skills ?? []).join(', '));
        }
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <p className="text-sm font-medium">Capacity this sprint</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`cap-${userId}`}>Points</Label>
              <Input id={`cap-${userId}`} inputMode="numeric" value={draft.capacity_pts ?? ''} onChange={(e) => setDraft({ ...draft, capacity_pts: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : undefined })} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`hpd-${userId}`}>Hours / day</Label>
              <Input id={`hpd-${userId}`} inputMode="decimal" value={draft.hours_per_day ?? ''} onChange={(e) => setDraft({ ...draft, hours_per_day: e.target.value ? Number(e.target.value.replace(/[^\d.]/g, '')) : undefined })} placeholder="8" className="h-8" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`role-${userId}`}>Role</Label>
            <Input id={`role-${userId}`} value={draft.role ?? ''} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Senior engineer" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`skills-${userId}`}>Skills (match task tags)</Label>
            <Input id={`skills-${userId}`} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Backend, Security" className="h-8" />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`pto-${userId}`}>Days off</Label>
            <div className="flex gap-1.5">
              <Input id={`pto-${userId}`} type="date" value={pto} onChange={(e) => setPto(e.target.value)} className="h-8" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pto}
                onClick={() => {
                  setDraft({ ...draft, pto: Array.from(new Set([...(draft.pto ?? []), pto])).sort() });
                  setPto('');
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(draft.pto ?? []).map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded border border-border px-1.5 font-mono text-2xs">
                  {d}
                  <button type="button" aria-label={`Remove ${d}`} onClick={() => setDraft({ ...draft, pto: (draft.pto ?? []).filter((x) => x !== d) })}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" variant="brand" className="w-full">
            Save capacity
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------------------------------------- heatmap */

function HeatCell({ hours, hpd, day, weekend, pto }: { hours: number | null; hpd: number; day: Date; weekend: boolean; pto: boolean }) {
  const label = day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const tone =
    weekend || pto
      ? 'bg-muted/40 text-subtle'
      : hours === null || hours === 0
        ? 'bg-muted/60 text-subtle'
        : hours > hpd * 1.06
          ? 'bg-danger/25 text-danger-foreground'
          : hours >= hpd * 0.94
            ? 'bg-warning/25 text-warning-foreground'
            : 'bg-brand/15 text-foreground';
  const text = pto ? 'PTO' : weekend ? 'WE' : hours ? `${round1(hours)}` : '–';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('flex h-7 w-8 shrink-0 items-center justify-center rounded font-mono text-[10px]', tone)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent>
        {label}: {pto ? 'day off' : weekend ? 'weekend' : `${round1(hours ?? 0)}h planned of ${hpd}h`}
      </TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ tab */

export default function CapacityTab() {
  const { sprint, window, sprintTasks, team } = useScrum();
  const { board, member, assignable, map } = useBoard();
  const saveCapacity = useSaveCapacity(board._id);
  const reassign = useReassign(board._id, map.assignee);
  const [unit, setUnit] = useState<Unit>('points');
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [rebalanceFor, setRebalanceFor] = useState<{ userId: string; preset?: { taskId: string; to: string } } | null>(null);
  const capacity: BoardCapacity = useMemo(() => board.capacity ?? {}, [board.capacity]);
  const ceiling = capacity.policy?.safety_ceiling ?? 0.85;
  const commitmentCap = capacity.policy?.commitment_cap ?? 0.9;
  const working = capacity.working_days?.length ? capacity.working_days : DEFAULT_WORKING_DAYS;

  const loads = useMemo(() => (window ? memberLoads(team, sprintTasks, window.days, capacity) : []), [team, sprintTasks, window, capacity]);
  const rec = useMemo(() => recommendRebalance(loads, ceiling), [loads, ceiling]);
  const showRec = rec && dismissed !== rec.task.id;
  const topDonor = [...loads].filter((l) => (l.load ?? 0) > ceiling).sort((a, b) => (b.load ?? 0) - (a.load ?? 0))[0];

  if (!sprint) return <EmptyNote>Pick a sprint to plan capacity.</EmptyNote>;
  if (!window) return <EmptyNote>Give {sprint.name} start and end dates to plan capacity day by day.</EmptyNote>;

  const save = (next: BoardCapacity) => saveCapacity.mutate(next);
  const withCap = loads.filter((l) => l.capacityPts);
  const capPts = sum(withCap.map((l) => l.capacityPts ?? 0));
  const capHours = sum(withCap.map((l) => l.capacityHours));
  const assignedPts = sum(loads.map((l) => l.assignedPts));
  const committedHours = sum(withCap.map((l) => l.committedHours));
  const unassigned = sprintTasks.filter((t) => t.assignees.length === 0 && t.statusCategory !== 'done');
  const unassignedPts = sum(unassigned.map((t) => t.points ?? 0));
  const watch = loads.filter((l) => l.status === 'warning' || l.status === 'over');
  const under = loads.filter((l) => l.status === 'available');
  const buffer = capPts - sum(withCap.map((l) => l.assignedPts));
  const notInTeam = assignable.filter((m) => !team.includes(m._id));
  const v = (ptsV: number, hrs: number) => (unit === 'points' ? `${round1(ptsV)} pts` : `${round1(hrs)}h`);

  // Epic allocation
  const epicMap = new Map<string, { pts: number; people: Set<string>; inFlight: number }>();
  for (const t of sprintTasks) {
    const k = t.epic || 'No epic';
    const e = epicMap.get(k) ?? { pts: 0, people: new Set<string>(), inFlight: 0 };
    e.pts += t.points ?? 0;
    if (t.assignees[0]) e.people.add(t.assignees[0]);
    if (['in_progress', 'review', 'blocked'].includes(t.statusCategory)) e.inFlight += 1;
    epicMap.set(k, e);
  }
  const epics = Array.from(epicMap.entries()).sort((a, b) => b[1].pts - a[1].pts);
  const epicIndex = new Map(epics.map(([k], i) => [k, i]));

  // Team load per day
  const dayLoad = window.days.map((d, i) => ({
    d,
    working: isWorkingDay(d, working),
    hours: sum(loads.map((l) => l.daily[i] ?? 0)),
    cap: sum(withCap.map((l) => (l.daily[i] === null ? 0 : l.hoursPerDay))),
  }));
  const maxDay = Math.max(1, ...dayLoad.map((x) => Math.max(x.hours, x.cap)));

  const exportCsv = () => {
    const rows = [['Member', 'Role', 'Capacity pts', 'Assigned pts', 'Load %', 'Committed h', 'Capacity h'], ...loads.map((l) => [member(l.userId)?.name ?? l.userId, l.role, String(l.capacityPts ?? ''), String(l.assignedPts), l.load === null ? '' : String(Math.round(l.load * 100)), String(l.committedHours), String(l.capacityHours)])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `${sprint.name} capacity.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl size="sm" aria-label="Unit" value={unit} onValueChange={setUnit} options={[{ value: 'points', label: 'Story points' }, { value: 'hours', label: 'Hours' }]} />
        {notInTeam.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="xs">
                <UserPlus /> Add member
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Plan capacity for</DropdownMenuLabel>
              {notInTeam.map((m) => (
                <DropdownMenuItem key={m._id} onSelect={() => save({ ...capacity, members: { ...(capacity.members ?? {}), [m._id]: { capacity_pts: 10, hours_per_day: 8 } } })}>
                  <UserAvatar user={m} size="xs" /> {m.name || m.email}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="brand"
            size="xs"
            disabled={!rec && !topDonor}
            title={rec ? undefined : topDonor ? 'No single move keeps everyone under the ceiling; choose one yourself' : 'Nobody is above the safety ceiling'}
            onClick={() => {
              if (rec) setRebalanceFor({ userId: rec.from.userId, preset: { taskId: rec.task.id, to: rec.to.userId } });
              else if (topDonor) setRebalanceFor({ userId: topDonor.userId });
            }}
          >
            <Scale /> Auto-balance
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Export capacity CSV" onClick={exportCsv}>
            <Download />
          </Button>
        </div>
      </div>

      <KpiRow>
        <KpiTile label="Committed capacity" icon={Gauge} value={capPts ? (unit === 'points' ? round1(sum(withCap.map((l) => l.assignedPts))) : `${round1(committedHours)}h`) : '—'} unit={capPts ? `/ ${unit === 'points' ? `${capPts} pts` : `${round1(capHours)}h`} cap` : 'set capacity below'} delta={capPts ? { text: `${Math.round((sum(withCap.map((l) => l.assignedPts)) / capPts) * 100)}%`, tone: sum(withCap.map((l) => l.assignedPts)) / capPts > commitmentCap ? 'bad' : 'neutral' } : undefined}>
          {capPts > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (sum(withCap.map((l) => l.assignedPts)) / capPts) * 100)}%` }} />
            </div>
          )}
        </KpiTile>
        <KpiTile label="Story points load" icon={Users} value={assignedPts} unit="pts assigned">
          <SegmentedBar segments={loads.map((l, i) => ({ key: l.userId, value: l.assignedPts, className: SERIES[i % SERIES.length], label: member(l.userId)?.name ?? 'Member' }))} />
          <p className="flex justify-between">
            <span>{loads.length} people</span>
            {capPts > 0 && <span>Target: {Math.round(capPts * commitmentCap)} pts</span>}
          </p>
        </KpiTile>
        <KpiTile label="Workload balance" icon={Scale} value={watch.length ? (watch.some((l) => l.status === 'over') ? 'Overloaded' : 'Watchlist') : 'Stable'} tone={watch.length ? 'warn' : 'good'} className="[&_span.text-3xl]:text-2xl">
          {watch.slice(0, 1).map((l) => (
            <p key={l.userId} className="text-warning-foreground">
              ● {member(l.userId)?.name ?? 'Member'} ({Math.round((l.load ?? 0) * 100)}% load)
            </p>
          ))}
          {under.slice(0, 1).map((l) => (
            <p key={l.userId}>
              {member(l.userId)?.name ?? 'Member'} has room ({Math.round((l.load ?? 0) * 100)}%)
            </p>
          ))}
          {!watch.length && !under.length && <p>Everyone is within the {Math.round(ceiling * 100)}% ceiling.</p>}
        </KpiTile>
        <KpiTile label="Unassigned work" icon={UserRound} value={unassignedPts} unit="pts" tone={unassignedPts ? 'warn' : 'good'}>
          <p>
            {unassigned.length} open {unassigned.length === 1 ? 'issue' : 'issues'} without an owner
          </p>
        </KpiTile>
        <KpiTile label="Buffer runway" icon={BatteryCharging} value={capPts ? round1(buffer) : '—'} unit={capPts ? 'pts unassigned capacity' : undefined} tone={buffer < 0 ? 'bad' : 'default'}>
          <p className="flex items-center gap-1">
            <ShieldCheck className="size-3" /> {capPts ? `${Math.round((Math.max(0, buffer) / capPts) * 100)}% held for hotfixes and triage` : 'Set capacity to see buffer'}
          </p>
        </KpiTile>
      </KpiRow>

      {showRec && rec && (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-brand/25 bg-brand/5 p-4" aria-label="Rebalance recommendation">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <Lightbulb className="size-4" />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Suggested rebalance.</span> Move <span className="font-mono text-xs">{rec.task.key}</span> {rec.task.title} ({rec.points} pts) from{' '}
            <span className="text-warning-foreground">
              {member(rec.from.userId)?.name} ({Math.round((rec.from.load ?? 0) * 100)}% load)
            </span>{' '}
            to <span className="text-brand">{member(rec.to.userId)?.name} ({Math.round((rec.to.load ?? 0) * 100)}%)</span>. Both stay under the {Math.round(ceiling * 100)}% ceiling.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDismissed(rec.task.id)}>
              Dismiss
            </Button>
            <Button variant="brand" size="sm" disabled={reassign.isPending} onClick={() => reassign.mutate({ ids: [rec.task.id], to: rec.to.userId })}>
              <ArrowLeftRight /> Apply {rec.points} pt transfer
            </Button>
          </div>
        </section>
      )}

      <Panel
        title="Contributor capacity & day-by-day load"
        subtitle={`${sprint.name} · ${window.days.length} days · planned hours spread over each task's dates`}
        actions={
          <div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-brand/15" /> Balanced</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-warning/25" /> Full</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-danger/25" /> Over</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-muted/40" /> Off</span>
          </div>
        }
      >
        {loads.length === 0 ? (
          <EmptyNote>Assign issues in this sprint or add members to plan their capacity.</EmptyNote>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-xs">
              <thead className="text-2xs uppercase tracking-wide text-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 font-medium">Contributor</th>
                  <th className="px-2 py-2 font-medium">Capacity & status</th>
                  <th className="px-2 py-2 font-medium">Committed tasks</th>
                  <th className="px-2 py-2 font-medium">Daily load</th>
                  <th className="px-4 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((l: MemberLoad) => {
                  const u = member(l.userId);
                  const pct = l.load === null ? null : Math.round(l.load * 100);
                  const ptoDays = window.days.filter((d) => l.pto.has(toDateKey(d))).length;
                  return (
                    <tr key={l.userId} className={cn('border-b border-border/70 align-top', l.status === 'available' && 'bg-success/5')}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <UserAvatar user={u} size="md" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium">
                              <span className="truncate">{u?.name || u?.email || 'Member'}</span>
                              {l.role && <span className="rounded border border-border px-1 text-2xs font-normal text-muted-foreground">{l.role}</span>}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-2xs text-muted-foreground">
                              {ptoDays ? (
                                <span className="flex items-center gap-1 text-warning-foreground">
                                  <CalendarOff className="size-3" /> {ptoDays}d off · {window.days.filter((d) => isWorkingDay(d, working)).length - ptoDays}d available
                                </span>
                              ) : (
                                `Full sprint · ${l.hoursPerDay}h/day`
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="w-52 px-2 py-3">
                        <p className="flex items-center justify-between">
                          <span className={cn('font-medium', STATUS_TONE[l.status])}>
                            {LOAD_LABEL[l.status]}
                            {pct !== null && ` ${pct}%`}
                          </span>
                          <span className="font-mono text-2xs text-muted-foreground">{l.capacityPts ? `${l.assignedPts} / ${l.capacityPts} pts` : `${l.assignedPts} pts`}</span>
                        </p>
                        <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={cn('h-full rounded-full', l.status === 'over' ? 'bg-danger' : l.status === 'warning' ? 'bg-warning' : 'bg-brand')} style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                        </div>
                        <p className="flex justify-between text-2xs text-muted-foreground">
                          <span>In flight: {v(l.inFlightPts, l.inFlightPts * (l.capacityPts ? l.capacityHours / l.capacityPts : 4))}</span>
                          {l.capacityPts ? <span>Buffer: {v(l.capacityPts - l.assignedPts, l.capacityHours - l.committedHours)}</span> : null}
                        </p>
                      </td>
                      <td className="w-64 px-2 py-3">
                        <div className="flex flex-wrap gap-1">
                          {l.tasks.slice(0, 6).map((t) => (
                            <span key={t.id} title={t.title} className={cn('inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-2xs', rec?.task.id === t.id && 'border-warning/40 text-warning-foreground', t.statusCategory === 'done' && 'opacity-50 line-through')}>
                              <span className={cn('size-1.5 rounded-full', SERIES[(epicIndex.get(t.epic || 'No epic') ?? 0) % SERIES.length])} />
                              {t.key} {t.points ?? 0}pt
                            </span>
                          ))}
                          {l.tasks.length > 6 && <span className="text-2xs text-subtle">+{l.tasks.length - 6}</span>}
                        </div>
                        {l.skills.length > 0 && <p className="mt-1 truncate text-2xs text-muted-foreground">{l.skills.join(' · ')}</p>}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-0.5">
                          {window.days.map((d, i) => (
                            <HeatCell key={i} day={d} hours={l.daily[i]} hpd={l.hoursPerDay} weekend={!isWorkingDay(d, working)} pto={l.pto.has(toDateKey(d))} />
                          ))}
                        </div>
                        <p className="mt-1 flex justify-between font-mono text-[10px] text-subtle">
                          <span>D1</span>
                          <span>D{window.days.length}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {l.status === 'available' && unassigned.length > 0 && (
                            <Button size="xs" variant="brand" onClick={() => reassign.mutate({ ids: [unassigned[0].id], to: l.userId })} title={`Assign ${unassigned[0].key}`}>
                              <Plus /> Assign
                            </Button>
                          )}
                          <Button variant="ghost" size="icon-sm" aria-label={`Rebalance ${u?.name ?? 'member'}`} onClick={() => setRebalanceFor({ userId: l.userId })} disabled={!l.tasks.some((t) => t.statusCategory !== 'done')}>
                            <ArrowLeftRight />
                          </Button>
                          <CapacityEditor
                            userId={l.userId}
                            capacity={capacity}
                            onSave={save}
                            trigger={
                              <Button variant="ghost" size="icon-sm" aria-label={`Capacity settings for ${u?.name ?? 'member'}`}>
                                <Settings2 />
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="flex flex-wrap gap-x-6 gap-y-1 px-4 pt-3 text-2xs text-muted-foreground">
              <span>Team: {loads.length} people</span>
              {capPts > 0 && <span>Capacity: {capPts} pts ({round1(capHours)}h)</span>}
              <span>Commitment: {assignedPts} pts{capPts ? ` (${Math.round((assignedPts / capPts) * 100)}%)` : ''}</span>
              <span className={cn(loads.some((l) => l.status === 'over') ? 'text-danger-foreground' : 'text-success-foreground')}>{loads.some((l) => l.status === 'over') ? 'Someone is above 100% of their capacity' : 'Nobody is above 100% of their capacity'}</span>
            </p>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Epic & domain allocation" subtitle={`${epics.length} ${epics.length === 1 ? 'epic' : 'epics'} in this sprint`}>
          {epics.length === 0 ? (
            <EmptyNote>No issues in this sprint.</EmptyNote>
          ) : (
            <>
              <SegmentedBar className="mb-4 h-2.5" segments={epics.map(([k, e], i) => ({ key: k, value: e.pts, className: SERIES[i % SERIES.length], label: k }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                {epics.slice(0, 6).map(([k, e], i) => (
                  <div key={k} className="rounded-lg border border-border p-3 text-xs">
                    <p className="flex items-center gap-2 font-medium">
                      <span className={cn('size-2 rounded-full', SERIES[i % SERIES.length])} />
                      <span className="min-w-0 flex-1 truncate">{k}</span>
                      <span className="font-mono text-2xs text-muted-foreground">
                        {e.pts} pts ({Math.round((e.pts / Math.max(1, sum(epics.map(([, x]) => x.pts)))) * 100)}%)
                      </span>
                    </p>
                    <p className="mt-1 text-2xs text-muted-foreground">
                      {Array.from(e.people).map((id) => member(id)?.name?.split(' ')[0] ?? '?').join(', ') || 'Unassigned'} · {e.inFlight} in flight
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
        <Panel title="Daily load" subtitle="Planned team hours per day against available hours.">
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Team load per day">
            {dayLoad.map((x, i) => {
              const over = x.working && x.cap > 0 && x.hours > x.cap;
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="relative flex h-full flex-1 flex-col justify-end">
                      {x.cap > 0 && <div className="absolute inset-x-0 border-t border-dashed border-foreground/30" style={{ bottom: `${(x.cap / maxDay) * 100}%` }} />}
                      <div className={cn('w-full rounded-t', !x.working ? 'bg-muted/50' : over ? 'bg-danger/70' : x.hours >= x.cap * 0.94 && x.cap ? 'bg-warning/70' : 'bg-brand/60')} style={{ height: `${Math.max(2, (x.hours / maxDay) * 100)}%` }} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {x.d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: {round1(x.hours)}h planned{x.cap ? ` of ${round1(x.cap)}h` : ''}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 font-mono text-[10px] text-subtle">
            {dayLoad.map((x, i) => (
              <span key={i} className={cn('flex-1 text-center', !x.working && 'opacity-40', x.working && x.cap > 0 && x.hours > x.cap && 'font-semibold text-danger-foreground')}>
                D{i + 1}
              </span>
            ))}
          </div>
          {dayLoad.some((x) => x.working && x.cap > 0 && x.hours > x.cap) ? (
            <p className="mt-3 text-2xs text-danger-foreground">Over-planned days: {dayLoad.map((x, i) => (x.working && x.cap > 0 && x.hours > x.cap ? `D${i + 1}` : null)).filter(Boolean).join(', ')}</p>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-2xs text-muted-foreground">
              <Ring value={capHours ? (committedHours / capHours) * 100 : 0} size={16} stroke={3} /> Commitment is capped at {Math.round(commitmentCap * 100)}% of team capacity.
            </p>
          )}
        </Panel>
      </div>

      <RebalanceDialog
        from={rebalanceFor ? (loads.find((l) => l.userId === rebalanceFor.userId) ?? null) : null}
        loads={loads}
        ceiling={ceiling}
        preset={rebalanceFor?.preset}
        open={!!rebalanceFor}
        onOpenChange={(o) => !o && setRebalanceFor(null)}
      />
    </div>
  );
}
