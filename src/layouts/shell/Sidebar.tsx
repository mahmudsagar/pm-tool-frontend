import { useState, type ComponentType, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronsUpDown, Clock, Home, Inbox, MessageSquare, PanelLeftClose, Plus, Settings, Star, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useAuthStore from '@/stores/useAuthStore';
import { useSpaceTree } from '@/features/spaces/queries';
import { useNotifications } from '@/hooks/useNotifications';
import { Progress } from '@/components/ui/progress';
import { formatBytes, useStorageUsage } from '@/features/library/queries';
import AddSpaceDialog from '@/layouts/elements/components/AddSpaceDialog';
import { SpaceNode } from './SpaceTree';
import { useShellState } from './treeState';
import type { Space } from '@/types/models';

function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const workspaces = useAuthStore((s) => s.workspaces);
  const current = useAuthStore((s) => s.currentWorkspace);
  const setCurrentWorkspace = useAuthStore((s) => s.setCurrentWorkspace);
  const name = current?.name ?? 'Workspace';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="-ml-1.5 flex w-full min-w-0 items-center justify-between gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-xs font-medium text-background">
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-1">
        <p className="px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-wider text-subtle">Workspaces</p>
        <ul>
          {workspaces.map((ws) => (
            <li key={ws._id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (ws._id !== current?._id) {
                    setCurrentWorkspace(ws);
                    navigate('/');
                  }
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-2xs font-medium">
                  {ws.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{ws.name}</span>
                {ws.role === 'owner' && <span className="text-2xs text-subtle">Owner</span>}
                {ws._id === current?._id && <Check className="size-3.5 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            navigate('/settings/workspace');
          }}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-4" /> Workspace settings
        </button>
      </PopoverContent>
    </Popover>
  );
}

interface NavItemProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  trailing?: ReactNode;
}

function NavItem({ to, icon: Icon, label, end, trailing }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors',
          isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </NavLink>
  );
}

function SpaceSection({ id, title, spaces, isPrivate, canCreate }: { id: string; title: string; spaces: Space[]; isPrivate: boolean; canCreate: boolean }) {
  const expanded = useShellState((s) => s.expanded[id] ?? true);
  const toggle = useShellState((s) => s.toggle);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="px-2.5 pt-5">
      <div className="flex items-center justify-between px-1.5">
        <button
          type="button"
          onClick={() => toggle(id, !expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-2xs font-medium uppercase tracking-wider text-subtle transition-colors hover:text-muted-foreground"
        >
          <ChevronDown className={cn('size-3.5 transition-transform', !expanded && '-rotate-90')} />
          {title}
        </button>
        {canCreate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label={`New ${isPrivate ? 'private' : 'team'} space`} onClick={() => setAddOpen(true)}>
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New {isPrivate ? 'private' : 'team'} space</TooltipContent>
          </Tooltip>
        )}
      </div>
      {expanded && (
        <ul className="mt-1 space-y-px">
          {spaces.length === 0 ? (
            <li className="px-2 py-1.5 text-2xs text-subtle">{isPrivate ? 'No private spaces yet' : 'No team spaces yet'}</li>
          ) : (
            spaces.map((space) => <SpaceNode key={space._id} space={space} />)
          )}
        </ul>
      )}
      {canCreate && (
        <AddSpaceDialog
          id={isPrivate ? 'private-root' : 'team-root'}
          space_visibility={isPrivate}
          isOpen={addOpen}
          setIsOpen={setAddOpen}
          onEditSuccess={undefined}
          hideTrigger
        />
      )}
    </section>
  );
}

/** Storage meter; hidden until the API reports usage. */
function StorageCard() {
  const { data } = useStorageUsage();
  if (!data) return null;
  const pct = data.quota_bytes ? Math.round((data.used_bytes / data.quota_bytes) * 100) : null;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between text-2xs">
        <span className="text-muted-foreground">Storage</span>
        <span className="font-mono text-foreground">{pct !== null ? `${pct}%` : formatBytes(data.used_bytes)}</span>
      </div>
      {pct !== null && <Progress value={pct} tone={pct > 90 ? 'danger' : pct > 75 ? 'warning' : 'neutral'} />}
      <div className="flex items-center justify-between text-2xs text-muted-foreground">
        <span>
          {data.active_contributors} active contributor{data.active_contributors === 1 ? '' : 's'}
        </span>
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
      </div>
    </div>
  );
}

export function Sidebar({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { privateSpaces, publicSpaces, isPending } = useSpaceTree();
  const workspace = useAuthStore((s) => s.currentWorkspace);
  const isOwner = workspace?.role === 'owner';
  const { unreadCount } = useNotifications('', workspace?._id ?? '') as { unreadCount: number };
  const setSidebarOpen = useShellState((s) => s.setSidebarOpen);

  return (
    <aside
      className={cn('flex h-full w-64 flex-col border-r border-border bg-surface', className)}
      aria-label="Main navigation"
      // Close the mobile drawer after following a link.
      onClick={(e) => {
        if (onNavigate && (e.target as HTMLElement).closest('a[href]')) onNavigate();
      }}
    >
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-3">
        <div className="min-w-0 flex-1 pl-1.5">
          <WorkspaceSwitcher />
        </div>
        {!onNavigate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Hide sidebar" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hide sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <nav className="space-y-px px-2.5 pt-3">
          <NavItem to="/" end icon={Home} label="All Files" />
          <NavItem to="/recent" icon={Clock} label="Recent" />
          <NavItem to="/starred" icon={Star} label="Starred" />
          <NavItem
            to="/notifications"
            icon={Inbox}
            label="Inbox"
            trailing={
              unreadCount > 0 ? (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-2xs font-medium text-foreground">{unreadCount > 99 ? '99+' : unreadCount}</span>
              ) : null
            }
          />
          <NavItem to="/chat" icon={MessageSquare} label="Direct & Channels" />
          <NavItem to="/users" icon={Users} label="Members" />
        </nav>

        {isPending ? (
          <div className="space-y-2 px-4 pt-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-3/5" />
          </div>
        ) : (
          <>
            {(isOwner || privateSpaces.length > 0) && (
              <SpaceSection id="section:private" title="Private Spaces" spaces={privateSpaces} isPrivate canCreate={isOwner} />
            )}
            <SpaceSection id="section:team" title="Team & Public" spaces={publicSpaces} isPrivate={false} canCreate />
          </>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border p-2.5">
        <StorageCard />
        <div className="grid grid-cols-2 gap-1">
          <NavItem to="/settings" icon={Settings} label="Settings" />
          <NavItem to="/trash" icon={Trash2} label="Trash" />
        </div>
      </div>
    </aside>
  );
}
