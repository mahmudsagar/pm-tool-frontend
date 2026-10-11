import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoard } from '@/features/board/boardContext';

interface InlineAddProps {
  label: string;
  values?: Record<string, unknown>;
  parentId?: string;
  className?: string;
  inputClassName?: string;
}

/** "+ Add task…" row that turns into a title input; Enter creates and keeps the input open. */
export function InlineAdd({ label, values, parentId, className, inputClassName }: InlineAddProps) {
  const { create, readOnly } = useBoard();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  if (readOnly) return null;

  const submit = async () => {
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await create({ title: name, values, parentId });
      setTitle('');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground', className)}
      >
        <Plus className="size-3.5" /> {label}
      </button>
    );
  }
  return (
    <div className={cn('flex items-center gap-2 px-2 py-1', className)}>
      <Plus className="size-3.5 shrink-0 text-subtle" />
      <input
        autoFocus
        value={title}
        disabled={busy}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title.trim() && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') {
            setTitle('');
            setOpen(false);
          }
        }}
        placeholder="Task name, then Enter"
        aria-label={label}
        className={cn('min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20', inputClassName)}
      />
    </div>
  );
}
