import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';
import { dateValues, priorityValue, toDateKey, type Priority } from '@/features/board/model';
import { PRIORITY_LABEL } from '@/features/board/view';
import { StatusDot } from '@/features/board/components/chips';
import { PRIORITY_DOT } from '@/features/board/components/tones';

/* ------------------------------------------------------------ new task */

export function NewTaskDialog({ open, onOpenChange, defaults, title: heading = 'New task' }: { open: boolean; onOpenChange: (o: boolean) => void; defaults?: Record<string, unknown>; title?: string }) {
  const { statuses, map, fields, assignable, create } = useBoard();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState<Priority | 'none'>('none');
  const [assignee, setAssignee] = useState('none');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setStatus(statuses[0]?.value ?? '');
    setPriority('none');
    setAssignee('none');
    setDue('');
  };

  const submit = async (keepOpen: boolean) => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const dueDate = due ? new Date(`${due}T00:00:00`) : null;
      await create({
        title: title.trim(),
        description: description.trim(),
        values: {
          ...(defaults ?? {}),
          [map.status]: status || statuses[0]?.value || '',
          ...(priority !== 'none' ? { [map.priority]: priorityValue(fields, map, priority) } : {}),
          ...(assignee !== 'none' ? { [map.assignee]: assignee } : {}),
          ...(dueDate ? dateValues(map, dueDate, dueDate) : {}),
        },
      });
      reset();
      if (!keepOpen) onOpenChange(false);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o && reset(), onOpenChange(o))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>Add details now or later from the task page.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="nt-title">Title</Label>
            <Input id="nt-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status || statuses[0]?.value} onValueChange={setStatus}>
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <StatusDot category={s.category} /> {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority | 'none')}>
                <SelectTrigger aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No priority</SelectItem>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span className={cn('size-2 rounded-full', PRIORITY_DOT[p])} /> {PRIORITY_LABEL[p]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger aria-label="Assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assignable.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-due">Due date</Label>
              <Input id="nt-due" type="date" value={due} min={toDateKey(new Date(2000, 0, 1))} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nt-desc">Description</Label>
            <Textarea id="nt-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" disabled={!title.trim() || busy} onClick={() => void submit(true)}>
              Create and add another
            </Button>
            <Button type="submit" variant="brand" disabled={!title.trim() || busy}>
              {busy ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

