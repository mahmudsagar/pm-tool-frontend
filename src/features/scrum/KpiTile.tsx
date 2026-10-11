import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiTileProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: ReactNode;
  unit?: ReactNode;
  delta?: { text: string; tone: 'good' | 'bad' | 'neutral' };
  children?: ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  className?: string;
}

const VALUE_TONE = {
  default: 'text-foreground',
  good: 'text-success-foreground',
  warn: 'text-warning-foreground',
  bad: 'text-danger-foreground',
};

/** Caps label, big number, unit, delta chip and a free-form footer. */
export function KpiTile({ label, icon: Icon, value, unit, delta, children, tone = 'default', className }: KpiTileProps) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4', className)} aria-label={label}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="truncate text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
        {Icon && <Icon className="size-4 shrink-0 text-subtle" />}
      </header>
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className={cn('text-3xl font-semibold tracking-tight tabular-nums', VALUE_TONE[tone])}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        {delta && (
          <span
            className={cn(
              'ml-auto rounded-md px-1.5 py-0.5 font-mono text-2xs',
              delta.tone === 'good' ? 'bg-success/10 text-success-foreground' : delta.tone === 'bad' ? 'bg-danger/10 text-danger-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {delta.text}
          </span>
        )}
      </div>
      {children && <div className="mt-auto space-y-1.5 text-2xs text-muted-foreground">{children}</div>}
    </section>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>;
}

export function Panel({ title, subtitle, actions, children, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-border bg-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-2xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">{children}</p>;
}
