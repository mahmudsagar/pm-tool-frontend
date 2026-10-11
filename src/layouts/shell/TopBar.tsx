import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Link from '@/BetterRouter/Link';
import {
  BookOpen,
  ChevronRight,
  HelpCircle,
  Keyboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme, type Theme } from '@/components/theme-provider';
import { UserAvatar } from '@/components/common/UserAvatar';
import NotificationCenter from '@/components/NotificationCenter';
import useAuthStore from '@/stores/useAuthStore';
import { useCommandPalette } from '@/features/search/commandPaletteStore';
import { useCreateDialog } from '@/features/create/createDialogStore';
import { KIND_META } from '@/features/spaces/entity';
import type { CreatableKind } from '@/features/create/useCreateResource';
import { cn } from '@/lib/utils';
import { useShellState } from './treeState';
import { useBreadcrumbs } from './useBreadcrumbs';
import { useShortcutsDialog } from './shortcuts';
import { useWorkspaceFeatures } from '@/features/settings/features';

export interface TopMenu {
  /** Page actions rendered inline in the top bar (e.g. history, share). */
  inlineContent?: ReactNode;
  /** Page actions collected in the top bar's overflow menu. */
  dropdownContent?: ReactNode;
}

const NEW_KINDS: { kind: CreatableKind; shortcut: string }[] = [
  { kind: 'document', shortcut: 'C D' },
  { kind: 'sheet', shortcut: 'C S' },
  { kind: 'whiteboard', shortcut: 'C W' },
  { kind: 'scrum', shortcut: 'C P' },
  { kind: 'board', shortcut: 'C B' },
  { kind: 'folder', shortcut: 'C F' },
];

function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  const workspace = useAuthStore((s) => s.currentWorkspace);
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-xs">
      <span className="hidden shrink-0 font-medium text-foreground sm:inline">{workspace?.name ?? 'Workspace'}</span>
      <span className="hidden text-subtle sm:inline" aria-hidden="true">
        /
      </span>
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              {i > 0 && <ChevronRight className="hidden size-3.5 shrink-0 text-subtle md:block" aria-hidden="true" />}
              <li className={cn('min-w-0', !last && 'hidden md:block')}>
                {crumb.to && !last ? (
                  <Link to={crumb.to} className="block truncate text-muted-foreground transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={cn('block truncate', last ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function NewMenu() {
  const show = useCreateDialog((s) => s.show);
  const { canCreate } = useWorkspaceFeatures();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="px-2 sm:px-2.5" aria-label="Create new">
          <Plus />
          <span className="hidden sm:inline">New</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        {NEW_KINDS.filter(({ kind }) => canCreate(kind)).map(({ kind, shortcut }) => {
          const Icon = KIND_META[kind].icon;
          return (
            <DropdownMenuItem key={kind} onSelect={() => show({ kind })}>
              <Icon />
              {KIND_META[kind].label}
              <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HelpMenu() {
  const openShortcuts = useShortcutsDialog((s) => s.setOpen);
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Help">
              <HelpCircle />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Help</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => openShortcuts(true)}>
          <Keyboard /> Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://github.com/betternotion" target="_blank" rel="noreferrer">
            <BookOpen /> Documentation
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Account menu"
        >
          <UserAvatar user={user} size="md" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{user?.name || 'Your account'}</p>
            <p className="truncate text-2xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <User /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings/workspace')}>
          <Settings /> Workspace settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings/members')}>
          <Users /> Members
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1" role="radiogroup" aria-label="Theme">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-md border py-1.5 text-2xs transition-colors',
                theme === value ? 'border-brand/50 bg-brand/10 text-foreground' : 'border-border text-muted-foreground hover:bg-accent',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar({ topMenu }: { topMenu?: TopMenu }) {
  const openPalette = useCommandPalette((s) => s.setOpen);
  const { sidebarOpen, setSidebarOpen, setMobileNavOpen } = useShellState();
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.currentWorkspace);
  const token = useAuthStore((s) => s.token);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:gap-3 sm:px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
        <Menu />
      </Button>
      {!sidebarOpen && (
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex" aria-label="Show sidebar" onClick={() => setSidebarOpen(true)}>
          <PanelLeft />
        </Button>
      )}

      <div className="min-w-0 flex-1 lg:flex-none lg:basis-auto">
        <Breadcrumbs />
      </div>

      <button
        type="button"
        onClick={() => openPalette(true)}
        className="ml-auto hidden h-8 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-xs text-subtle transition-colors hover:border-border-strong hover:text-muted-foreground md:flex lg:mx-auto"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search docs, sprints, whiteboards…</span>
        <Kbd className="ml-auto">⌘K</Kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => openPalette(true)}>
          <Search />
        </Button>
        {topMenu?.inlineContent && <div className="hidden items-center gap-1 sm:flex">{topMenu.inlineContent}</div>}
        <NewMenu />
        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />
        <div className="hidden sm:flex">
          <ThemeToggle />
        </div>
        {user && workspace && token && <NotificationCenter userId={user._id} workspaceId={workspace._id} token={token} />}
        <div className="hidden sm:flex">
          <HelpMenu />
        </div>
        {topMenu?.dropdownContent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Page actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {topMenu.dropdownContent}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="ml-1">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
