import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, Files, Inbox, Lock, MessageSquare, Plus, RefreshCw, Server, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { AvatarStack } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import useAuthStore from '@/stores/useAuthStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useRealtimeStatus } from '@/lib/realtime/socket';
import { useSpaceTree } from '@/features/spaces/queries';
import { KIND_META, entityIcon, entityPath } from '@/features/spaces/entity';
import { ItemMenu } from '@/features/spaces/ItemMenu';
import { useCreateDialog } from '@/features/create/createDialogStore';
import type { CreatableKind } from '@/features/create/useCreateResource';
import { FilesExplorer } from '@/features/files/FilesExplorer';
import { formatDate } from '@/features/files/formatDate';
import { useMemberDirectory } from '@/features/members/useMemberDirectory';
import { useFavoriteIds } from '@/features/library/queries';
import { getEntityRawName } from '@/utils/fileDisplayUtils';
import type { Space, User } from '@/types/models';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatChip({ icon: Icon, value, label, tone }: { icon: typeof Files; value?: number | string; label: string; tone?: 'success' | 'warning' }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground">
      <Icon className={cn('size-4', tone === 'success' && 'text-success-foreground', tone === 'warning' && 'text-warning-foreground')} />
      {value !== undefined && <span className="font-medium text-foreground">{value}</span>}
      <span>{label}</span>
    </div>
  );
}

const TILES: { kind: CreatableKind | 'chat'; title: string; hint: string; shortcut: string }[] = [
  { kind: 'document', title: 'Doc', hint: 'Wiki & specs', shortcut: 'C D' },
  { kind: 'scrum', title: 'Sprint Board', hint: 'Agile lanes & issues', shortcut: 'C P' },
  { kind: 'board', title: 'Databoard', hint: 'Tasks in 4 views', shortcut: 'C B' },
  { kind: 'sheet', title: 'Sheet', hint: 'Table database', shortcut: 'C S' },
  { kind: 'whiteboard', title: 'Whiteboard', hint: 'Vector diagrams', shortcut: 'C W' },
  { kind: 'chat', title: 'Chat Room', hint: 'Async threads', shortcut: 'G M' },
];

function CreateTiles() {
  const show = useCreateDialog((s) => s.show);
  const navigate = useNavigate();
  return (
    <section aria-labelledby="create-heading" className="space-y-3">
      <h2 id="create-heading" className="text-2xs font-medium uppercase tracking-wider text-subtle">
        Create resource
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TILES.map(({ kind, title, hint, shortcut }) => {
          const Icon = kind === 'chat' ? MessageSquare : KIND_META[kind].icon;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => (kind === 'chat' ? navigate('/chat') : show({ kind }))}
              className="group flex h-24 flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-border-strong hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-start justify-between">
                <Icon className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                <Kbd className="hidden border-transparent bg-transparent sm:inline-flex">{shortcut}</Kbd>
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{title}</span>
                <span className="block truncate text-2xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function lastActivity(space: Space) {
  const times = [space.updatedAt as string | undefined, ...space.childs.map((c) => c.updatedAt)]
    .filter(Boolean)
    .map((t) => new Date(t as string).getTime());
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}

function SpaceCard({ space, members }: { space: Space; members: Map<string, User> }) {
  const navigate = useNavigate();
  const show = useCreateDialog((s) => s.show);
  const Icon = entityIcon(space);
  const shared = [space.user_id as string | undefined, ...((space.shared_members as string[] | undefined) ?? [])]
    .filter((id, i, all): id is string => !!id && all.indexOf(id) === i)
    .map((id) => members.get(id))
    .filter((u): u is User => !!u);
  const preview = space.childs.slice(0, 4);
  const updated = lastActivity(space);

  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-5" style={space.color ? { color: String(space.color) } : undefined} />
        </span>
        <button type="button" onClick={() => navigate(`/space/${space._id}`)} className="min-w-0 flex-1 text-left focus-visible:outline-none">
          <h3 className="truncate text-sm font-medium text-foreground hover:underline">{space.name}</h3>
          <p className="text-2xs text-muted-foreground">
            {space.is_private ? 'Private space · Only you' : `Team space · ${Math.max(shared.length, 1)} member${shared.length === 1 ? '' : 's'}`}
          </p>
        </button>
        <ItemMenu target={{ id: space._id, kind: 'space', name: space.name }} />
      </header>

      <div className="min-h-[92px] rounded-lg border border-border bg-background/50 p-2.5">
        {preview.length === 0 ? (
          <div className="flex h-full min-h-[72px] flex-col items-center justify-center gap-1.5 text-2xs text-subtle">
            <span>No items yet</span>
            <Button variant="ghost" size="xs" onClick={() => show({ parent: { type: 'space', id: space._id } })}>
              <Plus /> Add item
            </Button>
          </div>
        ) : (
          <ul className="space-y-1">
            {preview.map((child) => {
              const ChildIcon = entityIcon(child);
              return (
                <li key={child._id}>
                  <button
                    type="button"
                    onClick={() => navigate(entityPath(child))}
                    className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ChildIcon className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">{getEntityRawName(child) || 'Untitled'}</span>
                    <span className="font-mono text-2xs text-subtle">{child.entity_type === 'folder' || child.entity_type === 'group' ? child.entity_type : ''}</span>
                  </button>
                </li>
              );
            })}
            {space.childs.length > preview.length && <li className="px-1 text-2xs text-subtle">+{space.childs.length - preview.length} more</li>}
          </ul>
        )}
      </div>

      <footer className="mt-auto flex items-center justify-between text-2xs text-muted-foreground">
        {space.is_private ? (
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" /> Private
          </span>
        ) : shared.length > 0 ? (
          <AvatarStack users={shared} max={4} size="xs" />
        ) : (
          <span />
        )}
        <span>{updated ? `Updated ${formatDate(updated).toLowerCase()}` : 'No activity yet'}</span>
      </footer>
    </article>
  );
}

type SpaceTab = 'all' | 'private' | 'team' | 'favorites';

function SpacesSection() {
  const { spaces, privateSpaces, publicSpaces, isPending } = useSpaceTree();
  const favoriteIds = useFavoriteIds();
  const { byId } = useMemberDirectory();
  const [tab, setTab] = useState<SpaceTab>('all');

  const list = useMemo(() => {
    if (tab === 'private') return privateSpaces;
    if (tab === 'team') return publicSpaces;
    if (tab === 'favorites') return spaces.filter((s) => favoriteIds.has(s._id));
    return spaces;
  }, [tab, spaces, privateSpaces, publicSpaces, favoriteIds]);

  return (
    <section aria-labelledby="spaces-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="spaces-heading" className="text-lg font-semibold tracking-tight text-foreground">
            Spaces &amp; hierarchy
          </h2>
          <p className="text-xs text-muted-foreground">Organized spaces, groups and permissions across your team.</p>
        </div>
        <div className="-mx-1 overflow-x-auto px-1">
          <SegmentedControl
            aria-label="Filter spaces"
            value={tab}
            onValueChange={setTab}
            options={[
              { value: 'all', label: 'All spaces' },
              { value: 'private', label: 'Private' },
              { value: 'team', label: 'Team & public' },
              { value: 'favorites', label: 'Favorites' },
            ]}
          />
        </div>
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[230px] rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border">
          <EmptyState
            compact
            icon={tab === 'favorites' ? Star : Server}
            title={tab === 'favorites' ? 'No favorite spaces yet' : 'No spaces here yet'}
            description={tab === 'favorites' ? 'Star a space from its menu to pin it here.' : 'Create a space from the sidebar to organize your work.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {list.map((space) => (
            <SpaceCard key={space._id} space={space} members={byId} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function HubPage() {
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.currentWorkspace);
  const { spaces, files, isPending, error, refetch } = useSpaceTree();
  const { unreadCount } = useNotifications('', workspace?._id ?? '') as { unreadCount: number };
  const realtime = useRealtimeStatus();
  const show = useCreateDialog((s) => s.show);
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];

  return (
    <div className="mx-auto w-full max-w-[1360px] space-y-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-2xs font-medium uppercase tracking-wider text-subtle">
            <span className="size-1.5 rounded-full bg-subtle" aria-hidden="true" />
            Workspace hub
            <span aria-hidden="true">·</span>
            <span className="truncate text-muted-foreground">{workspace?.name}</span>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {files.length > 0
              ? `${files.length} item${files.length === 1 ? '' : 's'} across ${spaces.length} space${spaces.length === 1 ? '' : 's'}.`
              : 'Start by creating a space, a doc or a board.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <StatChip icon={Server} value={spaces.length} label="Spaces" />
          <StatChip icon={Files} value={files.length} label="Files" />
          <StatChip icon={Inbox} value={unreadCount} label="Unread" />
          {realtime === 'connected' ? (
            <StatChip icon={RefreshCw} label="Synced" tone="success" />
          ) : (
            <StatChip icon={CloudOff} label={realtime === 'idle' ? 'Offline' : 'Connecting…'} tone="warning" />
          )}
        </div>
      </header>

      <CreateTiles />
      <SpacesSection />

      <section aria-labelledby="files-heading" className="space-y-4">
        <h2 id="files-heading" className="text-lg font-semibold tracking-tight text-foreground">
          All files
        </h2>
        <FilesExplorer
          rows={files}
          isLoading={isPending}
          error={error}
          onRetry={() => void refetch()}
          emptyAction={
            <Button size="sm" onClick={() => show()}>
              <Plus /> New
            </Button>
          }
        />
      </section>
    </div>
  );
}
