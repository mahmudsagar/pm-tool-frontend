import { type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useContainerContents, type ContainerType } from '@/features/spaces/queries';
import { entityIcon, entityKind, entityPath } from '@/features/spaces/entity';
import { useCreateDialog } from '@/features/create/createDialogStore';
import { getEntityRawName } from '@/utils/fileDisplayUtils';
import { ItemMenu } from '@/features/spaces/ItemMenu';
import { useShellState } from './treeState';
import type { Space, SpaceChild } from '@/types/models';

const INDENT_PX = 12;

const rowClass = (active: boolean) =>
  cn(
    'group/row relative flex h-7 w-full items-center gap-2 rounded-md pr-1 text-xs transition-colors',
    active
      ? 'bg-accent font-medium text-foreground'
      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  );

/** Hover-revealed row actions; always visible on touch screens and while a menu is open. */
function RowActions({ children }: { children: ReactNode }) {
  return (
    <div
      className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function Chevron({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      aria-expanded={open}
      className="flex size-4 shrink-0 items-center justify-center rounded text-subtle hover:text-foreground"
    >
      <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
    </button>
  );
}

function AddChildButton({ parent, label }: { parent: { type: 'space' | 'folder' | 'group'; id: string }; label: string }) {
  const show = useCreateDialog((s) => s.show);
  return (
    <Button variant="ghost" size="icon-xs" aria-label={`Add to ${label}`} onClick={() => show({ parent })}>
      <Plus />
    </Button>
  );
}

function SpaceIcon({ space }: { space: Space }) {
  if (typeof space.icon === 'string' && /^(https?:|data:|\/)/.test(space.icon)) {
    return <img src={space.icon} alt="" className="size-4 shrink-0 rounded object-cover" />;
  }
  const Icon = entityIcon(space);
  return <Icon className="size-4 shrink-0" style={space.color ? { color: String(space.color) } : undefined} aria-hidden="true" />;
}

export function SpaceNode({ space }: { space: Space }) {
  const expanded = useShellState((s) => !!s.expanded[space._id]);
  const toggle = useShellState((s) => s.toggle);
  const { pathname } = useLocation();
  const active = pathname === `/space/${space._id}`;
  const hasChildren = space.childs.length > 0;

  return (
    <li>
      <NavLink to={`/space/${space._id}`} className={cn(rowClass(active), 'pl-1.5')}>
        {hasChildren ? (
          <Chevron open={expanded} onToggle={() => toggle(space._id)} label={space.name} />
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <SpaceIcon space={space} />
        <span className="truncate font-medium text-foreground/90">{space.name}</span>
        <RowActions>
          <AddChildButton parent={{ type: 'space', id: space._id }} label={space.name} />
          <ItemMenu target={{ id: space._id, kind: 'space', name: space.name }} />
        </RowActions>
      </NavLink>
      {expanded && hasChildren && (
        <ul className="relative ml-[13px] border-l border-border pl-1">
          {space.childs.map((child) => (
            <TreeNode key={child._id} item={child} depth={1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function TreeNode({ item, depth }: { item: SpaceChild; depth: number }) {
  const kind = entityKind(item);
  if (kind === 'folder' || kind === 'group') return <ContainerNode item={item} type={kind} depth={depth} />;
  return <LeafNode item={item} depth={depth} />;
}

function ContainerNode({ item, type, depth }: { item: SpaceChild; type: ContainerType; depth: number }) {
  const expanded = useShellState((s) => !!s.expanded[item._id]);
  const toggle = useShellState((s) => s.toggle);
  const { pathname } = useLocation();
  const { data = [], isPending, isError } = useContainerContents(type, item._id, expanded);
  const children = data.flatMap((container) => container?.childs ?? []);
  const name = getEntityRawName(item) || 'Untitled';
  const Icon = entityIcon(item);
  const path = entityPath(item);

  return (
    <li>
      <NavLink to={path} className={rowClass(pathname === path)} style={{ paddingLeft: 4 + (depth - 1) * INDENT_PX }}>
        <Chevron open={expanded} onToggle={() => toggle(item._id)} label={name} />
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{name}</span>
        <RowActions>
          <AddChildButton parent={{ type, id: item._id }} label={name} />
          <ItemMenu target={{ id: item._id, kind: type, name }} />
        </RowActions>
      </NavLink>
      {expanded && (
        <ul className="relative ml-[13px] border-l border-border pl-1" style={{ marginLeft: 13 + (depth - 1) * INDENT_PX }}>
          {isPending ? (
            <li className="space-y-1 py-1 pl-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </li>
          ) : isError ? (
            <li className="py-1 pl-2 text-2xs text-danger-foreground">Couldn&apos;t load contents</li>
          ) : children.length === 0 ? (
            <li className="py-1 pl-2 text-2xs text-subtle">Empty</li>
          ) : (
            children.map((child) => <TreeNode key={child._id} item={child} depth={1} />)
          )}
        </ul>
      )}
    </li>
  );
}

function LeafNode({ item, depth }: { item: SpaceChild; depth: number }) {
  const { pathname } = useLocation();
  const path = entityPath(item);
  const Icon = entityIcon(item);
  const name = getEntityRawName(item) || 'Untitled';
  const kind = entityKind(item);

  return (
    <li>
      <NavLink to={path} className={rowClass(pathname === path)} style={{ paddingLeft: 4 + (depth - 1) * INDENT_PX + 16 + 8 }}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{name}</span>
        <RowActions>
          <ItemMenu target={{ id: item._id, kind, name }} />
        </RowActions>
      </NavLink>
    </li>
  );
}
