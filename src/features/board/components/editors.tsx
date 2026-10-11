import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, Flag, PanelRight, Plus, Trash2, UserRound, X } from 'lucide-react';
import { Calendar as CalendarJs } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/common/UserAvatar';
import { labelsToString } from '@/components/elements/dataView/scrum/labelUtils';
import { cn } from '@/lib/utils';
import { useBoard } from '../boardContext';
import { dateValues, findStatusOption, priorityValue, type Priority, type Task } from '../model';
import { PRIORITY_LABEL } from '../view';
import { LabelChip, StatusDot } from './chips';
import { PRIORITY_DOT } from './tones';

const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

// The shadcn calendar wrapper is untyped JS.
const Calendar = CalendarJs as unknown as React.ComponentType<{
  mode: 'single';
  selected?: Date;
  defaultMonth?: Date;
  onSelect: (d: Date | undefined) => void;
}>;

/* ---------------------------------------------------------- menu bodies */

function StatusItems({ task }: { task: Task }) {
  const { statuses, map, setValues } = useBoard();
  const current = findStatusOption(statuses, task.status)?.value;
  return (
    <>
      {statuses.map((s) => (
        <DropdownMenuItem key={s.value} onSelect={() => setValues(task, { [map.status]: s.value })}>
          <StatusDot category={s.category} /> {s.label}
          {current === s.value && <Check className="ml-auto" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function PriorityItems({ task }: { task: Task }) {
  const { fields, map, setValues } = useBoard();
  return (
    <>
      {PRIORITIES.map((p) => (
        <DropdownMenuItem key={p} onSelect={() => setValues(task, { [map.priority]: priorityValue(fields, map, p) })}>
          <span className={cn('size-2 rounded-full', PRIORITY_DOT[p])} /> {PRIORITY_LABEL[p]}
          {task.priority === p && <Check className="ml-auto" />}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setValues(task, { [map.priority]: '' })}>
        <X /> No priority
      </DropdownMenuItem>
    </>
  );
}

function AssigneeItems({ task }: { task: Task }) {
  const { assignable, map, setValues } = useBoard();
  return (
    <>
      <div className="max-h-64 overflow-y-auto">
        {assignable.map((m) => (
          <DropdownMenuItem key={m._id} onSelect={() => setValues(task, { [map.assignee]: m._id })}>
            <UserAvatar user={m} size="xs" /> <span className="truncate">{m.name || m.email}</span>
            {task.assignees.includes(m._id) && <Check className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setValues(task, { [map.assignee]: '' })}>
        <UserRound /> Unassigned
      </DropdownMenuItem>
    </>
  );
}

/* ------------------------------------------------------------- pickers */

interface PickerProps {
  task: Task;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
}

export function StatusPicker({ task, children, align = 'start' }: PickerProps) {
  const { readOnly } = useBoard();
  if (readOnly) return <>{children}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48" onClick={(e) => e.stopPropagation()}>
        <StatusItems task={task} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PriorityPicker({ task, children, align = 'start' }: PickerProps) {
  const { readOnly } = useBoard();
  if (readOnly) return <>{children}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44" onClick={(e) => e.stopPropagation()}>
        <PriorityItems task={task} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneePicker({ task, children, align = 'start' }: PickerProps) {
  const { readOnly } = useBoard();
  if (readOnly) return <>{children}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56" onClick={(e) => e.stopPropagation()}>
        <AssigneeItems task={task} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DuePicker({ task, children, align = 'start' }: PickerProps) {
  const { map, setValues, readOnly } = useBoard();
  const [open, setOpen] = useState(false);
  if (readOnly) return <>{children}</>;
  const setDue = (due: Date | null) => {
    // Keep the start date unless it would land after the new due date.
    const start = task.start && due && task.start <= due && task.start.getTime() !== task.due?.getTime() ? task.start : due;
    setValues(task, dateValues(map, due ? start : null, due));
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
        <Calendar mode="single" selected={task.due ?? undefined} defaultMonth={task.due ?? undefined} onSelect={(d: Date | undefined) => setDue(d ?? null)} />
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <Button size="xs" variant="ghost" onClick={() => setDue(new Date())}>
            Today
          </Button>
          <Button size="xs" variant="ghost" disabled={!task.due} onClick={() => setDue(null)}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function LabelsEditor({ task, children, align = 'start' }: PickerProps) {
  const { map, setValues, tasks, labelRegistry, readOnly } = useBoard();
  const [draft, setDraft] = useState('');
  if (readOnly || !map.labels) return <>{children}</>;
  const field = map.labels;
  const known = Array.from(new Set(tasks.flatMap((t) => t.labels))).sort((a, b) => a.localeCompare(b));
  const save = (labels: string[]) => setValues(task, { [field]: labelsToString(labels) });
  const toggle = (label: string) =>
    save(task.labels.includes(label) ? task.labels.filter((l) => l !== label) : [...task.labels, label]);
  const add = () => {
    const name = draft.trim();
    if (name && !task.labels.includes(name)) save([...task.labels, name]);
    setDraft('');
  };
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-2" onClick={(e) => e.stopPropagation()}>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a tag…" className="h-7 text-xs" aria-label="New tag" />
          <Button type="submit" size="icon-sm" variant="outline" aria-label="Add tag" disabled={!draft.trim()}>
            <Plus />
          </Button>
        </form>
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {known.length === 0 && <p className="px-1 py-2 text-2xs text-subtle">No tags on this board yet.</p>}
          {known.map((label) => (
            <button
              type="button"
              key={label}
              onClick={() => toggle(label)}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-accent"
            >
              <LabelChip label={label} registry={labelRegistry} />
              {task.labels.includes(label) && <Check className="ml-auto size-3.5 text-brand" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------- task actions */

/** Items shared by the row menu, the card menu and right-click. */
export function TaskActionItems({ task }: { task: Task }) {
  const { statuses, map, setValues, openTask, remove } = useBoard();
  const next = (() => {
    const i = statuses.findIndex((s) => s.value === findStatusOption(statuses, task.status)?.value);
    return i >= 0 && i < statuses.length - 1 ? statuses[i + 1] : undefined;
  })();
  return (
    <>
      <DropdownMenuItem onSelect={() => openTask(task.id)}>
        <PanelRight /> Open in side panel
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => openTask(task.id, true)}>
        <ExternalLink /> Open full page
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {next && (
        <DropdownMenuItem onSelect={() => setValues(task, { [map.status]: next.value })}>
          <ArrowRight /> Move to {next.label}
        </DropdownMenuItem>
      )}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <StatusDot category={task.statusCategory} className="mr-0.5" /> Status
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-48">
          <StatusItems task={task} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Flag className="mr-0.5 size-4" /> Priority
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          <PriorityItems task={task} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <UserRound className="mr-0.5 size-4" /> Assign
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-56">
          <AssigneeItems task={task} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void navigator.clipboard.writeText(`${window.location.origin}/document/${task.id}`)}>
        <Copy /> Copy link
      </DropdownMenuItem>
      <DropdownMenuItem className="text-danger-foreground focus:text-danger-foreground" onSelect={() => remove([task.id])}>
        <Trash2 /> Delete task
      </DropdownMenuItem>
    </>
  );
}

export function TaskMenu({ task, children, align = 'end' }: PickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="font-mono text-2xs font-normal text-subtle">{task.key}</DropdownMenuLabel>
        <TaskActionItems task={task} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
