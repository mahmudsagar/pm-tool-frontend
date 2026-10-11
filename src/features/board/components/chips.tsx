import {
  AlertTriangle,
  Ban,
  Bug,
  CheckCircle2,
  CircleDashed,
  Clock,
  Diamond,
  FileText,
  Flame,
  ListChecks,
  Minus,
  Palette,
  SignalHigh,
  SignalLow,
  Box,
  Zap,
  CircleCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLabelBadgeClassName, pickColorForLabel } from '@/components/elements/dataView/scrum/labelUtils';
import type { Priority, StatusCategory, Task } from '../model';
import { PRIORITY_TONE, relativeDue, STATUS_TONE } from './tones';
import { PRIORITY_LABEL } from '../view';

/* -------------------------------------------------------------- status */

export function StatusDot({ category, className }: { category?: StatusCategory; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', STATUS_TONE[category ?? 'todo'].dot, className)} />;
}

export function StatusPill({ label, category, className }: { label: string; category: StatusCategory; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 max-w-full items-center gap-1.5 rounded-full border px-2 text-2xs font-medium', STATUS_TONE[category].pill, className)}>
      <span className="size-1.5 shrink-0 rounded-full bg-current opacity-80" />
      <span className="truncate">{label || 'No status'}</span>
    </span>
  );
}

/* ------------------------------------------------------------ priority */

export function PriorityPill({ priority, className }: { priority: Priority | null; className?: string }) {
  if (!priority) return <span className={cn('text-2xs text-subtle', className)}>—</span>;
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 rounded-full border px-2 text-2xs font-medium', PRIORITY_TONE[priority], className)}>
      {priority === 'urgent' && <Flame className="size-3" />}
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** Compact glyph used on kanban cards. */
export function PriorityGlyph({ priority }: { priority: Priority | null }) {
  const label = priority ? `${PRIORITY_LABEL[priority]} priority` : 'No priority';
  const Icon = priority === 'urgent' ? AlertTriangle : priority === 'high' ? SignalHigh : priority === 'low' ? SignalLow : Minus;
  return (
    <span title={label} aria-label={label} className={cn('inline-flex size-5 items-center justify-center rounded', priority === 'urgent' ? 'text-danger-foreground' : priority === 'high' ? 'text-warning-foreground' : 'text-subtle')}>
      <Icon className="size-3.5" />
    </span>
  );
}

/* --------------------------------------------------------------- dates */

/** Due date chip: plain date, "Due today", "Due in 2d" or red "Overdue (-3d)". */
export function DateChip({ task, variant = 'chip', className }: { task: Task; variant?: 'chip' | 'cell'; className?: string }) {
  const r = relativeDue(task);
  if (!r) return <span className={cn('font-mono text-2xs text-subtle', className)}>{variant === 'cell' ? '—' : 'No due date'}</span>;
  const tone = r.done
    ? 'text-muted-foreground'
    : r.overdue
      ? 'border-danger/30 bg-danger/10 text-danger-foreground'
      : r.diff === 0
        ? 'border-danger/25 bg-danger/10 text-danger-foreground'
        : r.diff > 0 && r.diff <= 2
          ? 'border-warning/30 bg-warning/10 text-warning-foreground'
          : 'border-border bg-muted/50 text-muted-foreground';
  const text = r.done
    ? r.label
    : r.overdue
      ? `Overdue (${r.diff}d)`
      : r.diff === 0
        ? 'Due today'
        : r.diff > 1 && r.diff <= 2
          ? `Due in ${r.diff}d`
          : r.label;
  const Icon = r.overdue || r.diff === 0 ? AlertTriangle : Clock;
  return (
    <span className={cn('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 font-mono text-2xs', tone, className)} title={task.due?.toDateString()}>
      {!r.done && <Icon className="size-3" />}
      {text}
    </span>
  );
}

/* -------------------------------------------------------------- labels */

export function LabelChip({ label, registry, className }: { label: string; registry?: Record<string, { name: string; color: string }>; className?: string }) {
  const color = pickColorForLabel(label, registry ?? {});
  return (
    <span className={cn('inline-flex h-5 max-w-[10rem] items-center truncate rounded border px-1.5 text-2xs font-medium', getLabelBadgeClassName(color), className)}>
      {label}
    </span>
  );
}

/* ----------------------------------------------------------- task type */

/** Icon for a task, from its type text (bug, feature, doc…) and status. */
export function TaskTypeIcon({ task, className }: { task: Task; className?: string }) {
  const type = task.type.toLowerCase();
  const props = { className: cn('size-4 shrink-0', className), 'aria-hidden': true } as const;
  if (task.statusCategory === 'done') return <CircleCheck {...props} className={cn(props.className, 'text-success-foreground')} />;
  if (task.statusCategory === 'blocked') return <Ban {...props} className={cn(props.className, 'text-danger-foreground')} />;
  if (/bug|defect|incident/.test(type)) return <Bug {...props} className={cn(props.className, 'text-danger-foreground')} />;
  if (/milestone/.test(type)) return <Diamond {...props} className={cn(props.className, 'text-warning-foreground')} />;
  if (/doc|rfc|spec/.test(type)) return <FileText {...props} className={cn(props.className, 'text-info-foreground')} />;
  if (/design|ui|ux/.test(type)) return <Palette {...props} className={cn(props.className, 'text-brand')} />;
  if (/spike|perf|research/.test(type)) return <Zap {...props} className={cn(props.className, 'text-warning-foreground')} />;
  if (/epic|feature|story/.test(type)) return <Box {...props} className={cn(props.className, 'text-brand')} />;
  if (task.statusCategory === 'in_progress' || task.statusCategory === 'review') return <CircleDashed {...props} className={cn(props.className, 'text-brand')} />;
  return <CheckCircle2 {...props} className={cn(props.className, 'text-muted-foreground')} />;
}

export function ChecklistChip({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-2xs text-muted-foreground', className)} title={`${done} of ${total} done`}>
      <ListChecks className="size-3" />
      {done}/{total}
    </span>
  );
}

export function ProgressBar({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'success' }) {
  return (
    <div className={cn('h-1 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width]', tone === 'success' ? 'bg-success' : 'bg-brand')} style={{ width: `${value}%` }} />
    </div>
  );
}
