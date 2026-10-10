import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import NotFound from '@/BetterRouter/NotFound';
import { useContainerContents, useSpaceTree, type ContainerType } from '@/features/spaces/queries';
import { toFileRows } from '@/features/spaces/fileRows';
import { KIND_META, entityIcon } from '@/features/spaces/entity';
import { ItemMenu } from '@/features/spaces/ItemMenu';
import { useCreateDialog } from '@/features/create/createDialogStore';
import { FilesExplorer } from '@/features/files/FilesExplorer';
import { useRecordView } from '@/features/library/queries';
import type { SpaceChild } from '@/types/models';

type PageType = 'space' | ContainerType;

function resolveType(pathname: string, param?: string): PageType {
  const segment = param ?? pathname.split('/')[1];
  if (segment === 'folder' || segment === 'group') return segment;
  return 'space';
}

interface HeaderProps {
  kind: PageType;
  id: string;
  name: string;
  subtitle: string;
  icon: ReturnType<typeof entityIcon>;
}

function PageHeader({ kind, id, name, subtitle, icon: Icon }: HeaderProps) {
  const show = useCreateDialog((s) => s.show);
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xs font-medium uppercase tracking-wider text-subtle">{KIND_META[kind].label}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => show({ parent: { type: kind, id } })}>
          <Plus /> Add item
        </Button>
        <ItemMenu target={{ id, kind, name }} triggerClassName="size-8" />
      </div>
    </header>
  );
}

/** Space, folder and group pages: a header plus the shared files explorer. */
export default function ContainerPage({ id: propId }: { id?: string }) {
  const params = useParams();
  const { pathname } = useLocation();
  const id = propId ?? params.id ?? '';
  const kind = resolveType(pathname, params.type);
  const { spaces, isPending: treePending } = useSpaceTree();
  const contents = useContainerContents(kind === 'space' ? 'folder' : kind, id, kind !== 'space');

  useRecordView(kind, id);

  const view = useMemo(() => {
    if (kind === 'space') {
      const space = spaces.find((s) => s._id === id);
      if (!space) return null;
      return {
        name: space.name,
        subtitle: space.is_private ? 'Private space' : 'Team space',
        icon: entityIcon(space),
        rows: toFileRows(space.childs, { spaces }),
      };
    }
    const container = contents.data?.[0] as (SpaceChild & { childs?: SpaceChild[] }) | undefined;
    if (!container) return null;
    const children = (container.childs ?? []).map((c) => ({ ...c, space_id: c.space_id || container.space_id }));
    return {
      name: container.name || container.title || KIND_META[kind].label,
      subtitle: `${children.length} item${children.length === 1 ? '' : 's'}`,
      icon: entityIcon(container),
      rows: toFileRows(children, { spaces, parentName: container.name }),
    };
  }, [kind, id, spaces, contents.data]);

  const loading = kind === 'space' ? treePending : contents.isPending;
  const error = kind === 'space' ? null : contents.error;

  return (
    <div className="mx-auto w-full max-w-[1360px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {loading ? (
        <div className="flex items-center gap-3 border-b border-border pb-6">
          <Skeleton className="size-11 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-56" />
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void contents.refetch()} />
      ) : !view ? (
        <NotFound />
      ) : (
        <>
          <PageHeader kind={kind} id={id} name={view.name} subtitle={view.subtitle} icon={view.icon} />
          <FilesExplorer
            rows={view.rows}
            showAccessFilter={false}
            emptyTitle={`This ${KIND_META[kind].label.toLowerCase()} is empty`}
            emptyDescription="Add a document, board, sheet or folder."
          />
        </>
      )}
    </div>
  );
}
