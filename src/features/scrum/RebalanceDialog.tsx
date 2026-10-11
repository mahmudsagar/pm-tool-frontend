import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, CalendarOff, CheckCircle2, ListChecks, Lock, Ban, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/common/UserAvatar';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { round1, sum, LOAD_LABEL, loadStatus, type MemberLoad } from './analytics';
import { useReassign } from './api';

interface Props {
  from: MemberLoad | null;
  loads: MemberLoad[];
  ceiling: number;
  /** Pre-selected task and receiver (from a recommendation). */
  preset?: { taskId: string; to: string } | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

function Bar({ current, added = 0, max, tone }: { current: number; added?: number; max: number; tone: 'brand' | 'warning' }) {
  const w = (v: number) => `${Math.min(100, (v / Math.max(1, max)) * 100)}%`;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full', tone === 'warning' ? 'bg-warning' : 'bg-brand')} style={{ width: w(current) }} />
      {added > 0 && <div className="h-full bg-warning/80" style={{ width: w(added) }} />}
    </div>
  );
}

/** Move tasks from an overloaded member to someone with runway, with a live before/after simulation. */
export function RebalanceDialog({ from, loads, ceiling, preset, open, onOpenChange }: Props) {
  const { board, map, member } = useBoard();
  const reassign = useReassign(board._id, map.assignee);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(preset ? [preset.taskId] : []));
    setTo(preset?.to ?? null);
  }, [open, preset]);

  const openTasks = useMemo(() => (from?.tasks ?? []).filter((t) => t.statusCategory !== 'done').sort((a, b) => (b.points ?? 0) - (a.points ?? 0)), [from]);
  const moving = openTasks.filter((t) => selected.has(t.id));
  const movingPts = sum(moving.map((t) => t.points ?? 0));
  const hoursPerPt = from?.capacityPts ? from.capacityHours / from.capacityPts : 4;
  const candidates = useMemo(
    () =>
      loads
        .filter((l) => l.userId !== from?.userId)
        .map((l) => ({ l, runway: l.capacityPts ? l.capacityPts - l.assignedPts : -Infinity }))
        .sort((a, b) => b.runway - a.runway)
        .map(({ l }) => l),
    [loads, from],
  );

  // Cmd/Ctrl+Enter confirms.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && to && moving.length) {
        e.preventDefault();
        reassign.mutate({ ids: moving.map((t) => t.id), to }, { onSuccess: () => onOpenChange(false) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, to, moving, reassign, onOpenChange]);

  if (!from) return null;
  const user = member(from.userId);
  const afterPts = from.assignedPts - movingPts;
  const afterLoad = from.capacityPts ? afterPts / from.capacityPts : null;
  const afterStatus = loadStatus(afterLoad, ceiling);
  const target = to ? loads.find((l) => l.userId === to) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
              <ArrowLeftRight className="size-4" />
            </span>
            Rebalance workload — {user?.name || user?.email || 'member'}
            {from.role && <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-2xs font-medium text-warning-foreground">{from.role}</span>}
          </DialogTitle>
          <DialogDescription>
            Current allocation:{' '}
            <span className="text-warning-foreground">
              {from.assignedPts}
              {from.capacityPts ? ` / ${from.capacityPts} pts (${pct(from.load)} · ${LOAD_LABEL[from.status]})` : ' pts'}
            </span>{' '}
            — {round1(from.committedHours)}h committed.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <section className="rounded-xl border border-border bg-muted/20 p-4" aria-label="Capacity simulation">
            <p className="mb-3 flex items-center justify-between text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Capacity simulation
              {movingPts > 0 && <span className="font-mono normal-case text-brand">−{movingPts} pts reallocation</span>}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="mb-2 flex justify-between text-xs">
                  Current <span className="font-mono text-warning-foreground">{from.capacityPts ? `${from.assignedPts} / ${from.capacityPts} pts (${pct(from.load)})` : `${from.assignedPts} pts`}</span>
                </p>
                <Bar current={from.assignedPts} max={from.capacityPts ?? from.assignedPts} tone="warning" />
                <p className="mt-2 text-2xs text-muted-foreground">{round1(from.committedHours)}h committed</p>
              </div>
              <div className={cn('rounded-lg border bg-card p-3', movingPts ? 'border-brand/50' : 'border-border')}>
                <p className="mb-2 flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-brand" /> After transfer
                  </span>
                  <span className="font-mono">{from.capacityPts ? `${afterPts} / ${from.capacityPts} pts (${pct(afterLoad)} ${LOAD_LABEL[afterStatus]})` : `${afterPts} pts`}</span>
                </p>
                <Bar current={afterPts} max={from.capacityPts ?? from.assignedPts} tone="brand" />
                <p className="mt-2 text-2xs text-muted-foreground">
                  {round1(afterPts * hoursPerPt)}h load ({movingPts ? `−${round1(movingPts * hoursPerPt)}h` : 'no change'})
                </p>
              </div>
            </div>
          </section>

          <section aria-label="Tasks to reassign">
            <p className="mb-2 flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <ListChecks className="size-4 text-muted-foreground" /> Tasks to reassign
              </span>
              <span className="text-2xs font-normal text-muted-foreground">
                {moving.length} of {openTasks.length} selected ({movingPts} pts)
              </span>
            </p>
            <div className="space-y-2">
              {openTasks.length === 0 && <p className="text-xs text-muted-foreground">No open tasks to move.</p>}
              {openTasks.map((t) => {
                const checked = selected.has(t.id);
                const recommended = preset?.taskId === t.id;
                return (
                  <label
                    key={t.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors',
                      checked && 'border-brand/50 bg-brand/5',
                      t.locked && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {t.locked ? (
                      <Lock className="mt-0.5 size-4 text-subtle" aria-label="Locked" />
                    ) : (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setSelected((p) => {
                            const n = new Set(p);
                            if (v) n.add(t.id);
                            else n.delete(t.id);
                            return n;
                          })
                        }
                        aria-label={`Select ${t.title}`}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-2xs">
                        <span className="font-mono text-muted-foreground">{t.key}</span>
                        {t.epic && <span className="rounded border border-border px-1.5 text-muted-foreground">{t.epic}</span>}
                        {recommended && <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning-foreground">Recommended</span>}
                        {t.locked && <span className="text-subtle">Locked page</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-sm">{t.title}</span>
                    </span>
                    <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                      {t.points ?? 0} pts{t.priority === 'urgent' ? ' (P0)' : ` (~${round1((t.points ?? 0) * hoursPerPt)}h)`}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-label="Reassign to">
            <p className="mb-2 flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <UserPlus className="size-4 text-muted-foreground" /> Reassign to
              </span>
              <span className="text-2xs font-normal text-warning-foreground">Sorted by capacity runway</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {candidates.map((c) => {
                const u = member(c.userId);
                const after = c.assignedPts + movingPts;
                const afterL = c.capacityPts ? after / c.capacityPts : null;
                const overCeiling = afterL !== null && afterL > ceiling;
                const ptoDays = c.pto.size;
                const skills = c.skills.filter((sk) => moving.some((t) => t.labels.some((l) => l.toLowerCase() === sk.toLowerCase())));
                const isSel = to === c.userId;
                return (
                  <button
                    key={c.userId}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => setTo(c.userId)}
                    className={cn('flex flex-col gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-border-strong', isSel && 'border-brand/60 bg-brand/5 ring-1 ring-brand/30')}
                  >
                    <span className="flex items-center gap-2">
                      <UserAvatar user={u} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="truncate">{u?.name || u?.email || 'Member'}</span>
                          {c.role && <span className="rounded border border-border px-1 text-2xs font-normal text-muted-foreground">{c.role}</span>}
                        </span>
                        <span className="block text-2xs text-muted-foreground">
                          Current: {c.assignedPts}
                          {c.capacityPts ? ` / ${c.capacityPts} pts (${pct(c.load)} · ${LOAD_LABEL[c.status]})` : ' pts · no capacity set'}
                        </span>
                      </span>
                      {isSel && movingPts > 0 && <span className="rounded-full bg-brand/15 px-2 py-0.5 font-mono text-2xs text-brand">+{movingPts} pts</span>}
                    </span>
                    {isSel && movingPts > 0 && (
                      <>
                        <span className="flex justify-between text-2xs text-muted-foreground">
                          After transfer: {after}
                          {c.capacityPts ? ` / ${c.capacityPts} pts (${pct(afterL)})` : ' pts'}
                          <span>+{round1(movingPts * (c.capacityPts ? c.capacityHours / c.capacityPts : 4))}h</span>
                        </span>
                        <Bar current={c.assignedPts} added={movingPts} max={c.capacityPts ?? after} tone="brand" />
                      </>
                    )}
                    {skills.length > 0 && (
                      <span className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
                        Skill match:
                        {skills.map((sk) => (
                          <span key={sk} className="rounded border border-border px-1.5">
                            {sk}
                          </span>
                        ))}
                      </span>
                    )}
                    {overCeiling && movingPts > 0 && (
                      <span className="flex items-center gap-1 text-2xs text-warning-foreground">
                        <AlertTriangle className="size-3" /> +{movingPts} pts would exceed the {Math.round(ceiling * 100)}% safety ceiling
                      </span>
                    )}
                    {ptoDays > 0 && (
                      <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                        <CalendarOff className="size-3" /> {ptoDays} day{ptoDays === 1 ? '' : 's'} off this sprint
                      </span>
                    )}
                    {c.capacityPts && c.capacityPts - c.assignedPts <= 2 && !isSel && (
                      <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                        <Ban className="size-3" /> Near capacity ({Math.max(0, c.capacityPts - c.assignedPts)} pt buffer)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {target && movingPts > 0 && (
            <section className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground" aria-label="Impact">
              <p className="mb-1 font-medium text-foreground">Impact</p>
              <p>The sprint commitment stays the same; only the owner changes. {member(to!)?.name?.split(' ')[0] ?? 'They'} will get a notification for each task.</p>
            </section>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border p-4 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => (setSelected(new Set()), setTo(null))}>
            Reset selection
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              size="sm"
              disabled={!to || moving.length === 0 || reassign.isPending}
              onClick={() => to && reassign.mutate({ ids: moving.map((t) => t.id), to }, { onSuccess: () => onOpenChange(false) })}
            >
              <CheckCircle2 /> {reassign.isPending ? 'Transferring…' : `Confirm & transfer ${movingPts} pts`}
              <kbd className="ml-1 hidden rounded bg-white/15 px-1 font-mono text-[10px] sm:inline">⌘↵</kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
