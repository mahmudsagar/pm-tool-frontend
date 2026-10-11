import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSearch, Globe, LayoutGrid, List, Lock, Search, Star, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarStack } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import useDialog from '@/hooks/useDialog';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';
import { ItemMenu } from '@/features/spaces/ItemMenu';
import { KIND_META, type EntityKind } from '@/features/spaces/entity';
import { useInvalidateSpaceData } from '@/features/spaces/queries';
import type { FileRow } from '@/features/spaces/fileRows';
import { shortName, useMemberDirectory } from '@/features/members/useMemberDirectory';
import { toApiEntityType, useFavoriteIds, useToggleFavorite } from '@/features/library/queries';
import type { User } from '@/types/models';
import { formatDate } from './formatDate';

type TypeFilter = 'all' | 'document' | 'sheet' | 'whiteboard' | 'scrum' | 'board' | 'containers';
type AccessFilter = 'all' | 'private' | 'public';
type SortKey = 'modified' | 'name' | 'type';
type ViewMode = 'list' | 'grid';

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'document', label: 'Documents' },
  { value: 'sheet', label: 'Sheets' },
  { value: 'whiteboard', label: 'Whiteboards' },
  { value: 'scrum', label: 'Sprint boards' },
  { value: 'board', label: 'Databoards' },
  { value: 'containers', label: 'Folders & groups' },
];

const PAGE_SIZE = 25;

function matchesType(kind: EntityKind, filter: TypeFilter) {
  if (filter === 'all') return true;
  if (filter === 'containers') return kind === 'folder' || kind === 'group';
  return kind === filter;
}

function useStoredView(key: string, fallback: ViewMode): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(key) as ViewMode) || fallback;
    } catch {
      return fallback;
    }
  });
  return [
    view,
    (next) => {
      setView(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // Not critical.
      }
    },
  ];
}

interface FilesExplorerProps {
  rows: FileRow[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Offer the private/public filter (useful when rows span several spaces). */
  showAccessFilter?: boolean;
  emptyAction?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Override what clicking a row does (e.g. open it as a side-panel tab). */
  onOpenRow?: (row: FileRow) => void;
  /** Narrow container (side panel): only name, modified and actions columns. */
  compact?: boolean;
}

export function FilesExplorer({
  rows,
  isLoading,
  error,
  onRetry,
  showAccessFilter = true,
  emptyAction,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Create a document, board or folder to get started.',
  onOpenRow,
  compact = false,
}: FilesExplorerProps) {
  const navigateTo = useNavigate();
  const openRow = (row: FileRow) => (onOpenRow ? onOpenRow(row) : navigateTo(row.href));
  const { byId } = useMemberDirectory();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [access, setAccess] = useState<AccessFilter>('all');
  const [sort, setSort] = useState<SortKey>('modified');
  const [view, setView] = useStoredView('files-view', 'list');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (row) =>
        matchesType(row.kind, type) &&
        (access === 'all' || (access === 'private') === (row.sharing === 'Private')) &&
        (!q || row.name.toLowerCase().includes(q) || row.path.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'type') return a.typeLabel.localeCompare(b.typeLabel) || a.name.localeCompare(b.name);
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
  }, [rows, query, type, access, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Reset paging and stale selections when the result set changes.
  useEffect(() => setPage(0), [query, type, access, sort]);
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((r) => (allVisibleSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const star = (row: FileRow) =>
    toggleFavorite.mutate({ entityType: toApiEntityType(row.type, row.page_type), entityId: row.id, starred: !favoriteIds.has(row.id) });

  const filtersActive = query || type !== 'all' || access !== 'all';

  return (
    <div className={cn('space-y-3', compact && 'qp-files--compact')}>
      <Toolbar
        query={query}
        onQuery={setQuery}
        type={type}
        onType={setType}
        access={access}
        onAccess={setAccess}
        showAccessFilter={showAccessFilter}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
      />

      {selected.size > 0 && (
        <BulkBar
          rows={rows.filter((r) => selected.has(r.id))}
          onClear={() => setSelected(new Set())}
        />
      )}

      {error ? (
        <div className="rounded-xl border border-border bg-card">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : isLoading ? (
        <LoadingRows />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          {filtersActive ? (
            <EmptyState
              icon={FileSearch}
              title="No files match your filters"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setType('all');
                    setAccess('all');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState icon={FileSearch} title={emptyTitle} description={emptyDescription} action={emptyAction} />
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((row) => (
            <GridCard key={row.id} row={row} byId={byId} starred={favoriteIds.has(row.id)} onStar={() => star(row)} onOpen={() => openRow(row)} />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="hidden border-b border-border bg-muted/30 md:table-header-group">
              <tr className="text-2xs font-medium uppercase tracking-wider text-subtle">
                <th className="w-10 py-2.5 pl-4">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Select all on this page" />
                </th>
                <th className="py-2.5 pr-3 font-medium">Name</th>
                <th data-col="wide" className="hidden w-32 py-2.5 pr-3 font-medium lg:table-cell">Type</th>
                <th data-col="wide" className="hidden w-56 py-2.5 pr-3 font-medium xl:table-cell">Space &amp; path</th>
                <th data-col="wide" className="hidden w-28 py-2.5 pr-3 font-medium lg:table-cell">Access</th>
                <th className="hidden w-36 py-2.5 pr-3 font-medium sm:table-cell">Last modified</th>
                <th data-col="wide" className="hidden w-28 py-2.5 pr-3 font-medium xl:table-cell">Collaborators</th>
                <th className="w-16 py-2.5 pr-3 sm:w-20">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((row) => (
                <FileTableRow
                  key={row.id}
                  row={row}
                  byId={byId}
                  selected={selected.has(row.id)}
                  onSelect={() => toggleOne(row.id)}
                  starred={favoriteIds.has(row.id)}
                  onStar={() => star(row)}
                  onOpen={() => openRow(row)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && !error && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
          </span>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="font-mono text-2xs">
                {page + 1} of {pageCount}
              </span>
              <Button variant="outline" size="xs" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolbarProps {
  query: string;
  onQuery: (v: string) => void;
  type: TypeFilter;
  onType: (v: TypeFilter) => void;
  access: AccessFilter;
  onAccess: (v: AccessFilter) => void;
  showAccessFilter: boolean;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
}

function Toolbar({ query, onQuery, type, onType, access, onAccess, showAccessFilter, sort, onSort, view, onView }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Filter files or paths…"
          className="h-8 pl-8 text-xs"
          aria-label="Filter files"
        />
        {query && (
          <button type="button" onClick={() => onQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-subtle hover:text-foreground" aria-label="Clear filter">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Select value={type} onValueChange={(v) => onType(v as TypeFilter)}>
          <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showAccessFilter && (
          <Select value={access} onValueChange={(v) => onAccess(v as AccessFilter)}>
            <SelectTrigger className="h-8 w-[8.5rem] text-xs" aria-label="Access">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All spaces</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="public">Team &amp; public</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => onSort(v as SortKey)}>
          <SelectTrigger className="h-8 w-[10rem] text-xs" aria-label="Sort">
            <span className="text-subtle">Sort:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modified">Last modified</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="type">Type</SelectItem>
          </SelectContent>
        </Select>
        <SegmentedControl
          aria-label="View"
          value={view}
          onValueChange={onView}
          options={[
            { value: 'list', icon: List, ariaLabel: 'List view' },
            { value: 'grid', icon: LayoutGrid, ariaLabel: 'Grid view' },
          ]}
        />
      </div>
    </div>
  );
}

function BulkBar({ rows, onClear }: { rows: FileRow[]; onClear: () => void }) {
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const deleteEntity = useDeleteEntity();
  const invalidate = useInvalidateSpaceData();

  const removeAll = () =>
    confirm({
      title: `Delete ${rows.length} item${rows.length === 1 ? '' : 's'}?`,
      description: 'Deleted items and everything inside them are removed for everyone.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        const run = deleteEntity.mutateAsync as unknown as (v: Record<string, unknown>) => Promise<unknown>;
        await Promise.allSettled(
          rows.map((r) => run({ entityId: r.id, entityType: toApiEntityType(r.type, r.page_type), silent: true })),
        );
        await invalidate();
        onClear();
      },
    });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-xs">
      <span className="font-medium text-foreground">{rows.length} selected</span>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="xs" className="text-danger-foreground hover:text-danger-foreground" onClick={removeAll}>
          <Trash2 /> Delete
        </Button>
        <Button variant="ghost" size="xs" onClick={onClear}>
          Deselect
        </Button>
      </div>
    </div>
  );
}

function AccessLabel({ sharing }: { sharing: FileRow['sharing'] }) {
  const Icon = sharing === 'Private' ? Lock : Globe;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" /> {sharing}
    </span>
  );
}

function StarButton({ starred, onStar, name }: { starred: boolean; onStar: () => void; name: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={starred ? `Unstar ${name}` : `Star ${name}`}
      aria-pressed={starred}
      onClick={(e) => {
        e.stopPropagation();
        onStar();
      }}
      className={cn(starred ? 'text-warning-foreground' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100')}
    >
      <Star className={cn(starred && 'fill-current')} />
    </Button>
  );
}

interface RowProps {
  row: FileRow;
  byId: Map<string, User>;
  starred: boolean;
  onStar: () => void;
  onOpen: () => void;
}

function FileTableRow({ row, byId, selected, onSelect, starred, onStar, onOpen }: RowProps & { selected: boolean; onSelect: () => void }) {
  const Icon = row.icon;
  const modifiedBy = row.modifiedById ? byId.get(row.modifiedById) : undefined;
  const collaborators = [row.ownerId, ...row.sharedMembers]
    .filter((id, i, all): id is string => !!id && all.indexOf(id) === i)
    .map((id) => byId.get(id))
    .filter((u): u is User => !!u);

  return (
    <tr
      className={cn('group cursor-pointer transition-colors hover:bg-accent/40', selected && 'bg-brand/5')}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onOpen();
      }}
      tabIndex={0}
      aria-label={`Open ${row.name}`}
    >
      <td className="hidden w-10 py-3 pl-4 align-middle md:table-cell" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelect} aria-label={`Select ${row.name}`} />
      </td>
      <td className="py-3 pl-4 pr-3 md:pl-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
            <p className="truncate text-2xs text-muted-foreground">
              <span className="sm:hidden">{formatDate(row.updatedAt)} · </span>
              <span className="lg:hidden" data-compact="show">{row.typeLabel} · </span>
              <span className="xl:hidden" data-compact="show">{row.path || 'Workspace'}</span>
              <span className="hidden xl:inline" data-compact="hide">{row.typeLabel}</span>
            </p>
          </div>
        </div>
      </td>
      <td data-col="wide" className="hidden py-3 pr-3 lg:table-cell">
        <Badge variant="tag">{row.typeLabel}</Badge>
      </td>
      <td data-col="wide" className="hidden truncate py-3 pr-3 text-xs text-muted-foreground xl:table-cell">{row.path || '—'}</td>
      <td data-col="wide" className="hidden py-3 pr-3 lg:table-cell">
        <AccessLabel sharing={row.sharing} />
      </td>
      <td className="hidden py-3 pr-3 sm:table-cell">
        <p className="text-xs text-foreground/90">{formatDate(row.updatedAt)}</p>
        {modifiedBy && <p className="truncate text-2xs text-muted-foreground">by {shortName(modifiedBy)}</p>}
      </td>
      <td data-col="wide" className="hidden py-3 pr-3 xl:table-cell">
        {collaborators.length > 0 ? <AvatarStack users={collaborators} max={3} size="xs" /> : <span className="text-xs text-subtle">—</span>}
      </td>
      <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5">
          <StarButton starred={starred} onStar={onStar} name={row.name} />
          <ItemMenu target={{ id: row.id, kind: row.kind, name: row.name }} />
        </div>
      </td>
    </tr>
  );
}

function GridCard({ row, byId, starred, onStar, onOpen }: RowProps) {
  const Icon = row.icon;
  const modifiedBy = row.modifiedById ? byId.get(row.modifiedById) : undefined;
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <StarButton starred={starred} onStar={onStar} name={row.name} />
          <ItemMenu target={{ id: row.id, kind: row.kind, name: row.name }} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
        <p className="truncate text-2xs text-muted-foreground">{row.path || KIND_META[row.kind].label}</p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-2xs text-muted-foreground">
        <Badge variant="tag">{row.typeLabel}</Badge>
        <span className="truncate">
          {formatDate(row.updatedAt)}
          {modifiedBy && ` · ${shortName(modifiedBy)}`}
        </span>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/5" />
          </div>
          <Skeleton className="hidden h-3 w-20 md:block" />
        </div>
      ))}
    </div>
  );
}
