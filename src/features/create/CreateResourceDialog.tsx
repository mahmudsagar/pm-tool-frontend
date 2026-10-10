import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Lock, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Kbd } from '@/components/ui/kbd';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useSpaceTree } from '@/features/spaces/queries';
import { KIND_META } from '@/features/spaces/entity';
import { useCreateDialog } from './createDialogStore';
import { useCreateResource, type ContainerRef, type CreatableKind } from './useCreateResource';
import { AccessPicker } from './AccessPicker';
import type { Space, SpaceChild } from '@/types/models';

const KINDS: { kind: CreatableKind; hint: string }[] = [
  { kind: 'document', hint: 'Wiki & specs' },
  { kind: 'sheet', hint: 'Formulas & data' },
  { kind: 'whiteboard', hint: 'Infinite canvas' },
  { kind: 'scrum', hint: 'Sprints & issues' },
  { kind: 'board', hint: 'Tasks in 4 views' },
  { kind: 'folder', hint: 'Organize files' },
  { kind: 'group', hint: 'Section of a space' },
];

const SPACE_ROOT = '__root__';

/** Finds the space a container belongs to, for preselecting the location. */
function locate(spaces: Space[], parent: ContainerRef | null): { spaceId: string; containerKey: string } {
  if (!parent) return { spaceId: spaces[0]?._id ?? '', containerKey: SPACE_ROOT };
  if (parent.type === 'space') return { spaceId: parent.id, containerKey: SPACE_ROOT };
  const owner = spaces.find((s) => s.childs.some((c) => c._id === parent.id));
  return { spaceId: owner?._id ?? '', containerKey: `${parent.type}:${parent.id}` };
}

export function CreateResourceDialog() {
  const { open, kind: initialKind, parent: initialParent, close } = useCreateDialog();
  const { spaces, isPending: spacesLoading } = useSpaceTree();
  const { create, isPending } = useCreateResource();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [kind, setKind] = useState<CreatableKind>(initialKind);
  const [title, setTitle] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [containerKey, setContainerKey] = useState(SPACE_ROOT);
  const [members, setMembers] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [openInPanel, setOpenInPanel] = useState(false);

  // Reset every time the dialog opens, honoring the requested kind and parent.
  useEffect(() => {
    if (!open) return;
    const located = locate(spaces, initialParent);
    setKind(initialKind);
    setTitle('');
    setSpaceId(located.spaceId);
    setContainerKey(located.containerKey);
    setMembers([]);
    setTeams([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per open; tree refetches must not wipe user input
  }, [open]);

  // A parent outside the loaded tree (a nested folder) is kept as a fixed location.
  const fixedParent = initialParent && initialParent.type !== 'space' && !spaceId ? initialParent : null;

  const space = spaces.find((s) => s._id === spaceId);
  const containers = useMemo(
    () => (space?.childs ?? []).filter((c: SpaceChild) => c.entity_type === 'folder' || c.entity_type === 'group'),
    [space],
  );
  const isPrivate = !!space?.is_private;

  const parent: ContainerRef | null = fixedParent
    ? fixedParent
    : !spaceId
      ? null
      : containerKey === SPACE_ROOT
        ? { type: 'space', id: spaceId }
        : { type: containerKey.split(':')[0] as 'folder' | 'group', id: containerKey.split(':')[1] };

  const trimmed = title.trim();
  const canSubmit = !!trimmed && !!parent && !isPending;

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSubmit || !parent) return;
    try {
      const created = await create({ kind, title: trimmed, parent, isPrivate, sharedMembers: members, sharedTeams: teams });
      toast({ variant: 'success', title: `${KIND_META[kind].label} created`, description: trimmed });
      close();
      if (kind === 'folder' || kind === 'group' || !created.id) {
        if (created.id) navigate(created.path);
      } else if (openInPanel) {
        const params = new URLSearchParams(window.location.search);
        params.set(created.path, '_sidebar');
        navigate({ search: params.toString() });
      } else {
        navigate(created.path);
      }
    } catch {
      // The mutation hooks already show an error toast with the server's message.
    }
  };

  const label = KIND_META[kind].label;
  const isContainer = kind === 'folder' || kind === 'group';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        className="max-w-[620px] gap-5"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      >
        <DialogHeader className="flex-row items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <Plus className="size-4" />
          </span>
          <div className="space-y-0.5">
            <DialogTitle>Create new resource</DialogTitle>
            <DialogDescription>Pick a type, where it lives, and who can see it.</DialogDescription>
          </div>
        </DialogHeader>

        <form id="create-resource-form" onSubmit={submit} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-2xs font-medium uppercase tracking-wider text-subtle">Type</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KINDS.map(({ kind: option, hint }) => {
                const Icon = KIND_META[option].icon;
                const selected = option === kind;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setKind(option)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'border-brand/60 bg-brand/10' : 'border-border bg-card hover:border-border-strong hover:bg-accent/50',
                    )}
                  >
                    <Icon className={cn('size-4', selected ? 'text-brand' : 'text-muted-foreground')} />
                    <span className="space-y-0.5">
                      <span className="block text-xs font-medium text-foreground">{KIND_META[option].label}</span>
                      <span className="block text-2xs text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="create-title">Title</Label>
            <Input
              id="create-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Untitled ${label.toLowerCase()}`}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            {fixedParent ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Inside the selected {fixedParent.type}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={spaceId}
                  onValueChange={(value) => {
                    setSpaceId(value);
                    setContainerKey(SPACE_ROOT);
                  }}
                  disabled={spacesLoading}
                >
                  <SelectTrigger aria-label="Space">
                    <SelectValue placeholder={spacesLoading ? 'Loading spaces…' : 'Choose a space'} />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">Create a space first.</div>}
                    {spaces.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={containerKey} onValueChange={setContainerKey} disabled={!spaceId}>
                  <SelectTrigger aria-label="Folder or group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SPACE_ROOT}>Space root</SelectItem>
                    {containers.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Folders &amp; groups</SelectLabel>
                        {containers.map((c) => (
                          <SelectItem key={c._id} value={`${c.entity_type}:${c._id}`}>
                            {c.name || c.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sharing &amp; access</Label>
              <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                {isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
                {isPrivate ? 'Private space: only people you add' : `Everyone in ${space?.name ?? 'this space'}`}
              </span>
            </div>
            <AccessPicker members={members} teams={teams} onMembersChange={setMembers} onTeamsChange={setTeams} />
          </div>
        </form>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          {!isContainer ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={openInPanel} onCheckedChange={(v) => setOpenInPanel(v === true)} />
              Open in side panel
            </label>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form="create-resource-form" disabled={!canSubmit}>
              {isPending ? 'Creating…' : `Create ${label.toLowerCase()}`}
              <Kbd className="hidden border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/70 sm:inline-flex">⌘↵</Kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
