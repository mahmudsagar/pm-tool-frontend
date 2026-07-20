import { useMemo, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
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
import EpicBadge from '@/components/elements/dataView/scrum/EpicBadge';
import {
  listRegistryEpics,
  normalizeEpicKey,
  parseEpicValue,
  syncRegistryWithEpics,
} from '@/components/elements/dataView/scrum/epicUtils';

export default function EpicField({
  value,
  onChange,
  epicRegistry = {},
  onRegistryChange,
  className,
  compact = false,
  placeholder = 'Select epic',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = parseEpicValue(value);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listRegistryEpics(epicRegistry).filter((entry) => {
      if (!q) return true;
      return entry.name.toLowerCase().includes(q);
    });
  }, [epicRegistry, query]);

  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 && normalizeEpicKey(trimmedQuery) !== normalizeEpicKey(selected);

  const selectEpic = (name) => {
    const trimmed = parseEpicValue(name);
    onChange?.(trimmed);
    if (trimmed) {
      onRegistryChange?.(syncRegistryWithEpics(epicRegistry, [trimmed]));
    }
    setQuery('');
    setOpen(false);
  };

  const clearEpic = (e) => {
    e.stopPropagation();
    onChange?.('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            compact ? 'min-h-8 px-2 py-1 text-xs' : 'min-h-10 px-3 py-2 text-sm',
            className
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1 text-left">
            {selected ? (
              <EpicBadge name={selected} epicRegistry={epicRegistry} />
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            {selected ? (
              <span
                role="button"
                tabIndex={0}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={clearEpic}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    clearEpic(e);
                  }
                }}
                aria-label="Clear epic"
              >
                <X className="h-3 w-3" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create epic..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {canCreate ? (
              <CommandGroup heading="Create">
                <CommandItem value={`create-${trimmedQuery}`} onSelect={() => selectEpic(trimmedQuery)}>
                  Create &quot;{trimmedQuery}&quot;
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="Epics">
              {suggestions.length === 0 && !canCreate ? (
                <CommandEmpty>No epics yet. Type to create one.</CommandEmpty>
              ) : null}
              {suggestions.map((entry) => (
                <CommandItem
                  key={normalizeEpicKey(entry.name)}
                  value={entry.name}
                  onSelect={() => selectEpic(entry.name)}
                >
                  <EpicBadge name={entry.name} colorKey={entry.color} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
