import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({ title = "Couldn't load this", error, onRetry, className, compact = false }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : null;
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 text-center', compact ? 'px-3 py-6' : 'px-6 py-14', className)}>
      <div className="flex size-10 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/10 text-danger-foreground">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
