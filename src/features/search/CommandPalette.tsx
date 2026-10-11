import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Home, MessageSquare, Moon, Settings, Sun, Users } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useGlobalSearch } from '@/hooks/queries/useFilesQueries';
import { useTheme } from '@/components/theme-provider';
import { formatEntityDisplayName } from '@/utils/fileDisplayUtils';
import { KIND_META, entityIcon, entityPath } from '@/features/spaces/entity';
import { useCreateDialog } from '@/features/create/createDialogStore';
import type { CreatableKind } from '@/features/create/useCreateResource';
import { useCommandPalette } from './commandPaletteStore';
import { useWorkspaceFeatures } from '@/features/settings/features';

const GROUP_LABELS: Record<string, string> = {
  spaces: 'Spaces',
  folders: 'Folders',
  groups: 'Groups',
  pages: 'Pages & boards',
  teams: 'Teams',
};

const CREATE_ACTIONS: { kind: CreatableKind; shortcut: string }[] = [
  { kind: 'document', shortcut: 'C D' },
  { kind: 'sheet', shortcut: 'C S' },
  { kind: 'whiteboard', shortcut: 'C W' },
  { kind: 'scrum', shortcut: 'C P' },
  { kind: 'board', shortcut: 'C B' },
];

type SearchItem = { _id: string; entity_type?: string; name?: string; title?: string; page_type?: string };

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Global ⌘K palette: search across the workspace plus quick actions. */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const showCreate = useCreateDialog((s) => s.show);
  const { canCreate } = useWorkspaceFeatures();
  const { resolvedTheme: theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const { data, isFetching } = useGlobalSearch(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdK = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      if (isCmdK || (e.key === '/' && !isTypingTarget(e.target))) {
        e.preventDefault();
        setOpen(!useCommandPalette.getState().open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const results = Object.entries((data as { all?: Record<string, SearchItem[]> })?.all ?? {}).filter(([, list]) => list.length > 0);
  const searching = debounced.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search" commandProps={{ shouldFilter: !searching }}>
      <CommandInput
        placeholder="Search docs, boards, spaces… or type a command"
        value={query}
        onValueChange={setQuery}
        loading={isFetching}
      />
      <CommandList>
        {searching ? (
          <>
            {!isFetching && results.length === 0 && <CommandEmpty>No results for “{debounced}”.</CommandEmpty>}
            {results.map(([group, list], index) => (
              <Fragment key={group}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={GROUP_LABELS[group] ?? group}>
                  {list.map((item) => {
                    const isTeam = group === 'teams';
                    const Icon = isTeam ? Users : entityIcon(item);
                    return (
                      <CommandItem
                        key={`${group}-${item._id}`}
                        value={`${group}-${item._id}`}
                        onSelect={() => run(() => navigate(isTeam ? '/settings/teams' : entityPath(item)))}
                      >
                        <Icon />
                        <span className="truncate">{formatEntityDisplayName(item) || item.name || item.title}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Fragment>
            ))}
          </>
        ) : (
          <>
            <CommandEmpty>No matching commands.</CommandEmpty>
            <CommandGroup heading="Create">
              {CREATE_ACTIONS.filter(({ kind }) => canCreate(kind)).map(({ kind, shortcut }) => {
                const Icon = KIND_META[kind].icon;
                return (
                  <CommandItem key={kind} value={`new ${KIND_META[kind].label}`} onSelect={() => run(() => showCreate({ kind }))}>
                    <Icon />
                    New {KIND_META[kind].label.toLowerCase()}
                    <CommandShortcut>{shortcut}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Go to">
              <CommandItem value="go all files home" onSelect={() => run(() => navigate('/'))}>
                <Home /> All files
              </CommandItem>
              <CommandItem value="go inbox notifications" onSelect={() => run(() => navigate('/notifications'))}>
                <Bell /> Inbox
              </CommandItem>
              <CommandItem value="go chat direct channels" onSelect={() => run(() => navigate('/chat'))}>
                <MessageSquare /> Direct &amp; channels
              </CommandItem>
              <CommandItem value="go members people" onSelect={() => run(() => navigate('/settings/members'))}>
                <Users /> Members
              </CommandItem>
              <CommandItem value="go settings preferences" onSelect={() => run(() => navigate('/settings'))}>
                <Settings /> Settings
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Preferences">
              <CommandItem
                value="toggle theme dark light"
                onSelect={() => run(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Sun /> : <Moon />}
                Switch to {theme === 'dark' ? 'light' : 'dark'} theme
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
