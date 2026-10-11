import { daysBetween, isOverdue, type Priority, type StatusCategory, type Task } from '../model';

export const STATUS_TONE: Record<StatusCategory, { dot: string; pill: string }> = {
  backlog: { dot: 'bg-subtle', pill: 'border-border bg-muted/60 text-muted-foreground' },
  todo: { dot: 'bg-muted-foreground', pill: 'border-border bg-muted/60 text-muted-foreground' },
  in_progress: { dot: 'bg-brand', pill: 'border-brand/25 bg-brand/10 text-brand' },
  review: { dot: 'bg-warning', pill: 'border-warning/25 bg-warning/10 text-warning-foreground' },
  blocked: { dot: 'bg-danger', pill: 'border-danger/25 bg-danger/10 text-danger-foreground' },
  done: { dot: 'bg-success', pill: 'border-success/25 bg-success/10 text-success-foreground' },
};

export const PRIORITY_TONE: Record<Priority, string> = {
  urgent: 'border-danger/25 bg-danger/10 text-danger-foreground',
  high: 'border-warning/30 bg-warning/10 text-warning-foreground',
  medium: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'border-border bg-muted/60 text-muted-foreground',
};

export const PRIORITY_DOT: Record<Priority, string> = {
  urgent: 'bg-danger',
  high: 'bg-warning',
  medium: 'bg-brand',
  low: 'bg-subtle',
};

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString(undefined, opts);

export function relativeDue(task: Task, now = new Date()) {
  if (!task.due) return null;
  const diff = daysBetween(now, task.due);
  const label =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tomorrow'
        : diff === -1
          ? 'Yesterday'
          : fmt(task.due, { month: 'short', day: '2-digit', ...(task.due.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
  return { diff, label, overdue: isOverdue(task, now), done: task.statusCategory === 'done' };
}

