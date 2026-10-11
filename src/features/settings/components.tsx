import { useState, type ReactNode } from 'react';
import { Check, Copy, Lock, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/** Page heading used by every settings tab (eyebrow, title, description, actions). */
export function SettingsHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl space-y-1.5">
        <p className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-subtle">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Card with an icon title, optional meta tag and body. */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  meta,
  actions,
  tone,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: 'danger';
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card', tone === 'danger' ? 'border-destructive/30' : 'border-border', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'danger' ? 'text-danger-foreground' : 'text-muted-foreground')} aria-hidden="true" />}
          <div className="min-w-0">
            <h2 className={cn('text-sm font-medium', tone === 'danger' ? 'text-danger-foreground' : 'text-foreground')}>{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {meta && <div className="shrink-0">{meta}</div>}
        {actions}
      </header>
      <div className="space-y-4 px-5 pb-5 pt-2">{children}</div>
    </section>
  );
}

export function MetaTag({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">{children}</span>;
}

/** Label + control + optional hint, with optional prefix/suffix/lock. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-2xs text-danger-foreground">{error}</p> : hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

/** Read-only value with a lock icon (e.g. managed email). */
export function LockedValue({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground" aria-label={label}>
      <span className="truncate">{value}</span>
      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
    </div>
  );
}

export function CopyValue({ prefix, value }: { prefix?: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/40 pl-3 pr-1 text-sm">
      <span className="min-w-0 flex-1 truncate font-mono text-xs">
        {prefix && <span className="text-subtle">{prefix}</span>}
        <span className="text-foreground">{value}</span>
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${prefix ?? ''}${value}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard unavailable; nothing to do.
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

/** Row with icon tile, title, description and a switch. */
export function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      {Icon && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-foreground">{title}</span>
        {description && <span className="block text-2xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={title} />
    </label>
  );
}

/** Danger-zone row: text plus an action button. */
export function ActionRow({ title, description, action, tone }: { title: string; description: string; action: ReactNode; tone?: 'danger' }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between',
        tone === 'danger' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-background/40',
      )}
    >
      <div className="min-w-0">
        <p className={cn('text-xs font-medium', tone === 'danger' ? 'text-danger-foreground' : 'text-foreground')}>{title}</p>
        <p className="text-2xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone }: { label: string; value: ReactNode; sub?: string; icon: LucideIcon; tone?: 'warning' }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
          {sub && <span className={cn('truncate text-2xs', tone === 'warning' ? 'text-warning-foreground' : 'text-muted-foreground')}>{sub}</span>}
        </p>
      </div>
      <Icon className="size-5 shrink-0 text-subtle" aria-hidden="true" />
    </div>
  );
}

/** Sticky footer shown while a form has unsaved changes. */
export function UnsavedBar({ visible, saving, onReset, onSave }: { visible: boolean; saving: boolean; onReset: () => void; onSave: () => void }) {
  if (!visible) return null;
  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-border bg-elevated px-4 py-2.5 shadow-overlay">
      <span className="text-xs text-muted-foreground">You have unsaved changes</span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
