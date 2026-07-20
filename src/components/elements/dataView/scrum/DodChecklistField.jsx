import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  createDodItem,
  parseDodChecklist,
  serializeDodChecklist,
} from '@/components/elements/dataView/scrum/dodUtils';

export default function DodChecklistField({
  value,
  onChange,
  className,
  compact = false,
}) {
  const items = useMemo(() => parseDodChecklist(value), [value]);
  const [draft, setDraft] = useState('');

  const updateItems = (next) => {
    onChange?.(serializeDodChecklist(next));
  };

  const toggleItem = (id) => {
    updateItems(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const removeItem = (id) => {
    updateItems(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    const label = draft.trim();
    if (!label) return;
    updateItems([...items, createDodItem(label)]);
    setDraft('');
  };

  return (
    <div
      className={cn(
        'w-full rounded-md border border-input bg-transparent ring-offset-background',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        compact ? 'px-2 py-2 text-sm' : 'px-3 py-3 text-sm',
        className
      )}
    >
      {items.length === 0 && (
        <p className="mb-2 text-xs text-muted-foreground">No checklist items yet.</p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <Checkbox
              checked={Boolean(item.done)}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-0.5"
            />
            <span
              className={cn(
                'min-w-0 flex-1 leading-snug',
                item.done && 'text-muted-foreground line-through'
              )}
            >
              {item.label}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeItem(item.id)}
              aria-label={`Remove ${item.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className={cn('flex gap-2', items.length > 0 ? 'mt-3' : '')}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add checklist item"
          className={cn('h-8 flex-1 text-xs', compact && 'h-7')}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('h-8 shrink-0', compact && 'h-7')}
          onClick={addItem}
          disabled={!draft.trim()}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
