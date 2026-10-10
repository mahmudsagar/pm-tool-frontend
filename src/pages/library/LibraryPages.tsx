import { useMemo } from 'react';
import { Clock, RotateCcw, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import useDialog from '@/hooks/useDialog';
import useAuthStore from '@/stores/useAuthStore';
import { FilesExplorer } from '@/features/files/FilesExplorer';
import { formatDate } from '@/features/files/formatDate';
import { toFileRows } from '@/features/spaces/fileRows';
import { useSpaceTree } from '@/features/spaces/queries';
import { KIND_META, entityIcon, entityKind } from '@/features/spaces/entity';
import { shortName } from '@/features/members/useMemberDirectory';
import {
  useFavorites,
  usePurgeTrash,
  useRecent,
  useRestoreFromTrash,
  useTrash,
  type FavoriteRecord,
  type RecentRecord,
  type TrashRecord,
} from '@/features/library/queries';
import type { SpaceChild } from '@/types/models';

function PageHeader({ icon: Icon, title, description, actions }: { icon: typeof Clock; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions}
    </header>
  );
}

const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto w-full max-w-[1360px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
);

/** Turns favorite/recent records into rows the files explorer understands. */
function useLibraryRows(records: (FavoriteRecord | RecentRecord)[] | undefined, dateField: 'created_at' | 'viewed_at') {
  const { spaces } = useSpaceTree();
  return useMemo(() => {
    const children: SpaceChild[] = (records ?? [])
      .filter((r) => r.entity && r.entity._id)
      .map((r) => ({
        ...r.entity,
        _id: r.entity_id,
        entity_type: r.entity_type,
        page_type: r.entity.page_type ?? (r.entity_type === 'board' ? 'board' : undefined),
        // Sort and display by when it was starred/viewed.
        updatedAt: (r as unknown as Record<string, string>)[dateField] ?? r.entity.updatedAt,
      })) as SpaceChild[];
    const spaceChildren = children.filter((c) => c.entity_type === 'space');
    const rows = toFileRows(
      children.filter((c) => c.entity_type !== 'space'),
      { spaces },
    );
    const spaceRows = toFileRows(spaceChildren, { spaces }).map((row) => ({ ...row, path: 'Space' }));
    return [...spaceRows, ...rows];
  }, [records, spaces, dateField]);
}

export function RecentPage() {
  const { data, isPending, error, refetch } = useRecent(50);
  const rows = useLibraryRows(data, 'viewed_at');
  return (
    <Page>
      <PageHeader icon={Clock} title="Recent" description="Docs, boards and spaces you opened lately." />
      <FilesExplorer
        rows={rows}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="Nothing opened yet"
        emptyDescription="Items you open will show up here."
      />
    </Page>
  );
}

export function StarredPage() {
  const { data, isPending, error, refetch } = useFavorites();
  const rows = useLibraryRows(data, 'created_at');
  return (
    <Page>
      <PageHeader icon={Star} title="Starred" description="Your pinned items, only visible to you." />
      <FilesExplorer
        rows={rows}
        isLoading={isPending}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No starred items"
        emptyDescription="Star docs, boards or spaces from their ⋯ menu to find them quickly."
      />
    </Page>
  );
}

function daysLeft(expiresAt: string) {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  return Math.max(0, days);
}

function TrashRow({ item }: { item: TrashRecord }) {
  const restore = useRestoreFromTrash();
  const purge = usePurgeTrash();
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const kind = entityKind({ entity_type: item.entity_type, page_type: item.page_type });
  const Icon = entityIcon({ entity_type: item.entity_type, page_type: item.page_type });
  const left = daysLeft(item.expires_at);

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{item.name || 'Untitled'}</p>
          <p className="truncate text-2xs text-muted-foreground">
            {KIND_META[kind].label}
            {item.item_count > 1 && ` · ${item.item_count} items`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground sm:w-56">
        {item.deleted_by && <UserAvatar user={item.deleted_by} size="xs" />}
        <span className="truncate">
          Deleted {formatDate(item.deleted_at).toLowerCase()}
          {item.deleted_by && ` by ${shortName(item.deleted_by)}`}
        </span>
      </div>
      <Badge variant={left <= 3 ? 'warning' : 'outline'} className="w-fit">
        {left === 0 ? 'Expires today' : `${left} day${left === 1 ? '' : 's'} left`}
      </Badge>
      <div className="flex items-center gap-1 sm:ml-2">
        <Button variant="outline" size="xs" disabled={restore.isPending} onClick={() => restore.mutate(item._id)}>
          <RotateCcw /> Restore
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="text-danger-foreground hover:text-danger-foreground"
          onClick={() =>
            confirm({
              title: 'Delete forever?',
              description: `“${item.name}” will be permanently deleted. This can't be undone.`,
              confirmLabel: 'Delete forever',
              confirmVariant: 'destructive',
              onConfirm: () => purge.mutateAsync({ id: item._id }),
            })
          }
        >
          Delete forever
        </Button>
      </div>
    </li>
  );
}

export function TrashPage() {
  const { data = [], isPending, error, refetch } = useTrash();
  const purge = usePurgeTrash();
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const canEmptyAll = useAuthStore((s) => s.currentWorkspace?.role === 'owner');

  return (
    <Page>
      <PageHeader
        icon={Trash2}
        title="Trash"
        description="Deleted items stay here for 30 days before they're removed for good."
        actions={
          data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger-foreground"
              onClick={() =>
                confirm({
                  title: 'Empty trash?',
                  description: canEmptyAll
                    ? `All ${data.length} items will be permanently deleted.`
                    : 'Items you deleted will be permanently removed.',
                  confirmLabel: 'Empty trash',
                  confirmVariant: 'destructive',
                  onConfirm: () => purge.mutateAsync({ all: true }),
                })
              }
            >
              <Trash2 /> Empty trash
            </Button>
          )
        }
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={Trash2} title="Trash is empty" description="When you delete something, you can restore it from here." />
        ) : (
          <ul className="divide-y divide-border">
            {data.map((item) => (
              <TrashRow key={item._id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
