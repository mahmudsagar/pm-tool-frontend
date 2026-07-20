import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import LabelBadge from '@/components/elements/dataView/scrum/LabelBadge';
import {
  labelsToString,
  listRegistryLabels,
  normalizeLabelKey,
  parseLabelsString,
  syncRegistryWithLabels,
} from '@/components/elements/dataView/scrum/labelUtils';

export default function LabelsField({
  value,
  onChange,
  labelRegistry = {},
  onRegistryChange,
  className,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => parseLabelsString(value), [value]);
  const selectedKeys = useMemo(() => new Set(selected.map(normalizeLabelKey)), [selected]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listRegistryLabels(labelRegistry).filter((entry) => {
      if (selectedKeys.has(normalizeLabelKey(entry.name))) return false;
      if (!q) return true;
      return entry.name.toLowerCase().includes(q);
    });
  }, [labelRegistry, query, selectedKeys]);

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 && !selectedKeys.has(normalizeLabelKey(trimmedQuery));

  const addLabel = (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed || selectedKeys.has(normalizeLabelKey(trimmed))) return;
    const next = [...selected, trimmed];
    onChange?.(labelsToString(next));
    onRegistryChange?.(syncRegistryWithLabels(labelRegistry, [trimmed]));
    setQuery('');
    setOpen(false);
  };

  const removeLabel = (name) => {
    const key = normalizeLabelKey(name);
    onChange?.(labelsToString(selected.filter((item) => normalizeLabelKey(item) !== key)));
  };

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent ring-offset-background',
        'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        compact ? 'min-h-8 px-2 py-1 text-sm' : 'min-h-10 px-3 py-2 text-sm',
        className
      )}
    >
      {selected.map((name) => (
        <LabelBadge
          key={normalizeLabelKey(name)}
          name={name}
          labelRegistry={labelRegistry}
          onRemove={() => removeLabel(name)}
          size="sm"
        />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 text-muted-foreground transition-colors',
              'hover:text-foreground focus-visible:outline-none',
              compact ? 'h-6 text-xs' : 'h-7 text-sm'
            )}
          >
            <Plus className="h-3 w-3 shrink-0" />
            {selected.length === 0 ? <span>Add label</span> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create label..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {canCreate ? (
                <CommandGroup heading="Create">
                  <CommandItem value={`create-${trimmedQuery}`} onSelect={() => addLabel(trimmedQuery)}>
                    Create &quot;{trimmedQuery}&quot;
                  </CommandItem>
                </CommandGroup>
              ) : null}
              <CommandGroup heading="Suggestions">
                {suggestions.length === 0 && !canCreate ? (
                  <CommandEmpty>No labels yet. Type to create one.</CommandEmpty>
                ) : null}
                {suggestions.map((entry) => (
                  <CommandItem
                    key={normalizeLabelKey(entry.name)}
                    value={entry.name}
                    onSelect={() => addLabel(entry.name)}
                  >
                    <LabelBadge name={entry.name} colorKey={entry.color} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
