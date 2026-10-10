import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Hash, Link2, MoreHorizontal, PanelRight, PencilLine, Settings, Star, StarOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import useDialog from '@/hooks/useDialog';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';
import { useUpdateEntityTitle } from '@/hooks/mutations/useFilesMutations';
import { useUpdateSpace } from '@/hooks/mutations/useSpacesMutations';
import { useCreateSpaceChannel } from '@/hooks/mutations/useChatMutations';
import SpaceSettingsSheet from '@/layouts/elements/components/SpaceSettingsSheet';
import { KIND_META, entityPath, isContainerKind, type EntityKind } from './entity';
import { useInvalidateSpaceData } from './queries';
import { useFavoriteIds, useToggleFavorite } from '@/features/library/queries';

export interface MenuItemTarget {
  id: string;
  kind: EntityKind;
  name: string;
}

type Mutate = (variables: Record<string, unknown>) => Promise<unknown>;
const call = (mutation: { mutateAsync: unknown }, variables: Record<string, unknown>) => (mutation.mutateAsync as Mutate)(variables);

/** The API entity type behind each UI kind. */
function apiEntity(kind: EntityKind): 'space' | 'folder' | 'group' | 'board' | 'page' {
  if (kind === 'space' || kind === 'folder' || kind === 'group') return kind;
  if (kind === 'board' || kind === 'scrum') return 'board';
  return 'page';
}

interface ItemMenuProps {
  target: MenuItemTarget;
  /** Shown when the trigger is rendered inside another interactive row. */
  triggerClassName?: string;
  align?: 'start' | 'end';
}

/** Rename, share link, side panel, settings and delete for any space-tree item. */
export function ItemMenu({ target, triggerClassName, align = 'end' }: ItemMenuProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useDialog() as { confirm: (options: Record<string, unknown>) => void };
  const deleteEntity = useDeleteEntity();
  const createChannel = useCreateSpaceChannel();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const starred = favoriteIds.has(target.id);
  const path = entityPath({ _id: target.id, entity_type: apiEntity(target.kind), page_type: target.kind });
  const label = KIND_META[target.kind].label.toLowerCase();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast({ variant: 'success', title: 'Link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the link' });
    }
  };

  const openInPanel = () => {
    const params = new URLSearchParams(location.search);
    params.set(path, '_sidebar');
    navigate({ pathname: location.pathname, search: params.toString() });
  };

  const startChannel = async () => {
    try {
      const conversation = (await call(createChannel, { spaceId: target.id, name: `${target.name} channel` })) as { _id?: string };
      toast({ variant: 'success', title: 'Channel created' });
      if (conversation?._id) navigate(`/chat?c=${conversation._id}`);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not create channel', description: (error as Error).message });
    }
  };

  const remove = () =>
    confirm({
      title: `Delete ${label}?`,
      description: isContainerKind(target.kind)
        ? `“${target.name}” and everything inside it will be deleted. This can't be undone.`
        : `“${target.name}” will be deleted. This can't be undone.`,
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        await call(deleteEntity, { entityId: target.id, entityType: apiEntity(target.kind) });
        // Leave the page (or close the side panel) if it shows the deleted item.
        const params = new URLSearchParams(location.search);
        let changed = false;
        for (const key of Array.from(params.keys())) {
          if (key.includes(target.id)) {
            params.delete(key);
            changed = true;
          }
        }
        if (location.pathname.includes(target.id)) navigate('/', { replace: true });
        else if (changed) navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
      },
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className={triggerClassName}
            aria-label={`More actions for ${target.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-52" onClick={(e) => e.stopPropagation()}>
          {!isContainerKind(target.kind) && (
            <DropdownMenuItem onSelect={openInPanel}>
              <PanelRight /> Open in side panel
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => toggleFavorite.mutate({ entityType: apiEntity(target.kind), entityId: target.id, starred: !starred })}
          >
            {starred ? <StarOff /> : <Star />} {starred ? 'Remove from starred' : 'Add to starred'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <PencilLine /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={copyLink}>
            <Link2 /> Copy link
          </DropdownMenuItem>
          {target.kind === 'space' && (
            <>
              <DropdownMenuItem onSelect={startChannel}>
                <Hash /> Create channel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings /> Space settings
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={remove} className="text-danger-foreground focus:text-danger-foreground [&_svg]:!text-danger-foreground">
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog target={target} open={renameOpen} onOpenChange={setRenameOpen} />
      {target.kind === 'space' && <SpaceSettingsSheet spaceId={target.id} open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  );
}

function RenameDialog({ target, open, onOpenChange }: { target: MenuItemTarget; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState(target.name);
  const updateTitle = useUpdateEntityTitle();
  const updateSpace = useUpdateSpace();
  const invalidate = useInvalidateSpaceData();
  const { toast } = useToast();
  const pending = updateTitle.isPending || updateSpace.isPending;
  const trimmed = name.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed === target.name) return onOpenChange(false);
    try {
      if (target.kind === 'space') await call(updateSpace, { spaceId: target.id, data: { name: trimmed } });
      else await call(updateTitle, { entity: apiEntity(target.kind), id: target.id, title: trimmed });
      await invalidate();
      toast({ variant: 'success', title: 'Renamed', description: trimmed });
      onOpenChange(false);
    } catch {
      // Mutation hooks already surface the server error.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setName(target.name);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Rename {KIND_META[target.kind].label.toLowerCase()}</DialogTitle>
          <DialogDescription>Choose a new name for “{target.name}”.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} aria-label="Name" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
