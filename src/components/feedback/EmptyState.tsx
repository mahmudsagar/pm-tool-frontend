import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Smaller variant for sidebars, popovers and table bodies. */
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-1.5 px-3 py-6' : 'gap-3 px-6 py-14', className)}>
      {Icon && (
        <div className={cn('flex items-center justify-center rounded-lg border border-border bg-muted/40 text-subtle', compact ? 'size-8' : 'size-10')}>
          <Icon className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />
        </div>
      )}
      <div className="space-y-1">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
