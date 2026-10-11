import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toDateKey, type Task } from '@/features/board/model';
import { addDays } from './analytics';
import { useSprintMutations, type Sprint } from './api';

function SprintForm({ initial, onSubmit, submitLabel, busy, requireDates }: { initial: Partial<Sprint>; onSubmit: (v: { name: string; goal: string; start_date: string; end_date: string }) => void; submitLabel: string; busy: boolean; requireDates?: boolean }) {
  const today = new Date();
  const [name, setName] = useState(initial.name ?? '');
  const [goal, setGoal] = useState(initial.goal ?? '');
  const [start, setStart] = useState(initial.start_date ?? (requireDates ? toDateKey(today) : ''));
  const [end, setEnd] = useState(initial.end_date ?? (requireDates ? toDateKey(addDays(today, 13)) : ''));
  const datesInvalid = !!start && !!end && end < start;
  const missing = !name.trim() || (requireDates && (!start || !end));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!missing && !datesInvalid) onSubmit({ name: name.trim(), goal: goal.trim(), start_date: start, end_date: end });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="sp-name">Name</Label>
        <Input id="sp-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 12" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sp-goal">Sprint goal</Label>
        <Textarea id="sp-goal" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What should be true at the end of this sprint?" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sp-start">Start</Label>
          <Input id="sp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-end">End</Label>
          <Input id="sp-end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {datesInvalid && <p className="text-2xs text-danger-foreground">The end date must be on or after the start date.</p>}
      <DialogFooter>
        <Button type="submit" variant="brand" disabled={busy || !!missing || datesInvalid}>
          {busy ? 'Saving…' : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SprintFormDialog({ boardId, sprint, open, onOpenChange, nextName }: { boardId: string; sprint?: Sprint | null; open: boolean; onOpenChange: (o: boolean) => void; nextName?: string }) {
  const m = useSprintMutations(boardId);
  const busy = m.create.isPending || m.update.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{sprint ? `Edit ${sprint.name}` : 'New sprint'}</DialogTitle>
          <DialogDescription>{sprint ? 'Change the name, goal or dates.' : 'Plan it now; start it when the team is ready.'}</DialogDescription>
        </DialogHeader>
        {open && (
          <SprintForm
            initial={sprint ?? { name: nextName }}
            busy={busy}
            submitLabel={sprint ? 'Save' : 'Create sprint'}
            onSubmit={(v) => {
              const body = { ...v, start_date: v.start_date || null, end_date: v.end_date || null };
              if (sprint) m.update.mutate({ id: sprint._id, ...body }, { onSuccess: () => onOpenChange(false) });
              else m.create.mutate(body, { onSuccess: () => onOpenChange(false) });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function StartSprintDialog({ boardId, sprint, open, onOpenChange, taskCount, points }: { boardId: string; sprint: Sprint | null; open: boolean; onOpenChange: (o: boolean) => void; taskCount: number; points: number }) {
  const m = useSprintMutations(boardId);
  if (!sprint) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start {sprint.name}</DialogTitle>
          <DialogDescription>
            Commits {taskCount} {taskCount === 1 ? 'issue' : 'issues'} ({points} pts). Work added later counts as scope change.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SprintForm
            initial={sprint}
            requireDates
            busy={m.start.isPending || m.update.isPending}
            submitLabel="Start sprint"
            onSubmit={async (v) => {
              await m.update.mutateAsync({ id: sprint._id, name: v.name, goal: v.goal });
              m.start.mutate({ id: sprint._id, start_date: v.start_date, end_date: v.end_date }, { onSuccess: () => onOpenChange(false) });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CompleteSprintDialog({ boardId, sprint, sprints, tasks, open, onOpenChange }: { boardId: string; sprint: Sprint | null; sprints: Sprint[]; tasks: Task[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const m = useSprintMutations(boardId);
  const next = sprints.filter((s) => s.status === 'planned');
  const [moveTo, setMoveTo] = useState<string>('');
  if (!sprint) return null;
  const done = tasks.filter((t) => t.statusCategory === 'done');
  const open_ = tasks.filter((t) => t.statusCategory !== 'done');
  const pts = (xs: Task[]) => xs.reduce((s, t) => s + (t.points ?? 0), 0);
  const target = moveTo || next[0]?._id || 'backlog';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete {sprint.name}</DialogTitle>
          <DialogDescription>Closes the sprint and records what was finished for velocity reports.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Completed</dt>
            <dd className="mt-1 font-semibold text-success-foreground">
              {done.length} issues · {pts(done)} pts
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-2xs uppercase tracking-wide text-muted-foreground">Unfinished</dt>
            <dd className="mt-1 font-semibold text-warning-foreground">
              {open_.length} issues · {pts(open_)} pts
            </dd>
          </div>
        </dl>
        {open_.length > 0 && (
          <div className="space-y-1.5">
            <Label>Move unfinished issues to</Label>
            <Select value={target} onValueChange={setMoveTo}>
              <SelectTrigger aria-label="Move unfinished issues to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {next.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value="backlog">Backlog</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" disabled={m.complete.isPending} onClick={() => m.complete.mutate({ id: sprint._id, move_to: target }, { onSuccess: () => onOpenChange(false) })}>
            {m.complete.isPending ? 'Completing…' : 'Complete sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
