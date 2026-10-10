import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  label?: string;
  className?: string;
  /** Fill the whole viewport (used before the app shell renders). */
  fullscreen?: boolean;
}

export function PageLoader({ label = 'Loading…', className, fullscreen = false }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full items-center justify-center gap-2 text-sm text-muted-foreground',
        fullscreen ? 'h-screen' : 'min-h-[40vh]',
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
