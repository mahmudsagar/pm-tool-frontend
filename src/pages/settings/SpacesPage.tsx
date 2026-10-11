import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Globe, Lock, Plus, Search, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar, AvatarStack } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import useDialog from '@/hooks/useDialog';
import { http } from '@/lib/api/client';
import useAuthStore from '@/stores/useAuthStore';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';
import AddSpaceDialog from '@/layouts/elements/components/AddSpaceDialog';
import { entityIcon, entityKind } from '@/features/spaces/entity';
import { invalidateSpaceData, useSpaceTree } from '@/features/spaces/queries';
import { formatDate } from '@/features/files/formatDate';
import { Field, SettingsHeader } from '@/features/settings/components';
import { useIsWorkspaceAdmin, useUpdateWorkspace, useWorkspaceMembersDetailed, useWorkspaceSettings, type WorkspaceMember } from '@/features/settings/queries';
import type { Space } from '@/types/models';

type SpaceRole = 'manager' | 'contributor' | 'viewer';

interface SpaceDetail extends Space {
  description?: string;
  color?: string;
  space_lead?: string | null;
  default_view?: string;
  shared_members?: string[];
  member_roles?: Record<string, SpaceRole>;
  archived_at?: string | null;
  updatedAt?: string;
}

const ROLE_LABEL: Record<SpaceRole, string> = { manager: 'Space admin', contributor: 'Contributor', viewer: 'Viewer' };
const COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#64748b'];

function useSpaceDetail(id: string | null) {
  return useQuery({
    queryKey: ['spaces', 'detail', id],
    queryFn: async () => {
      const list = await http.get<SpaceDetail[]>('/v1/space', { query: { id } });
      return list?.[0] ?? null;
    },
    enabled: !!id,
  });
}

function useArchivedSpaces(enabled: boolean) {
  const userId = useAuthStore((s) => s.user?._id);
  const workspaceId = useAuthStore((s) => s.currentWorkspace?._id);
  return useQuery({
    queryKey: ['spaces', 'archived', workspaceId],
    queryFn: async () => {
      try {
        const all = (await http.get<SpaceDetail[]>('/v1/space', { query: { user_id: userId, include_archived: true } })) ?? [];
        return all.filter((s) => s.archived_at);
      } catch {
        return [];
      }
    },
    enabled: enabled && !!userId,
  });
}

function spaceStats(space: Space) {
  const kinds = space.childs.map((c) => entityKind(c));
  return {
    docs: kinds.filter((k) => k === 'document' || k === 'sheet' || k === 'whiteboard').length,
    boards: kinds.filter((k) => k === 'board' || k === 'scrum').length,
    folders: kinds.filter((k) => k === 'folder' || k === 'group').length,
  };
}

function PolicyCard({ title, description, children, footer }: { title: string; description: string; children?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      {footer && <div className="mt-auto flex items-center justify-between text-2xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

function SpaceRow({ space, selected, onSelect, members }: { space: SpaceDetail; selected: boolean; onSelect: () => void; members: Map<string, WorkspaceMember> }) {
  const Icon = entityIcon(space);
  const stats = spaceStats(space);
  const people = [space.user_id as string | undefined, ...(space.shared_members ?? [])]
    .filter((id, i, all): id is string => !!id && all.indexOf(id) === i)
    .map((id) => members.get(id))
    .filter((m): m is WorkspaceMember => !!m);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'relative flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-brand/50 bg-brand/[0.04]' : 'border-border hover:border-border-strong',
      )}
    >
      {selected && <span className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" />}
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40" style={space.color ? { color: space.color } : undefined}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{space.name}</span>
            {space.is_private ? (
              <Badge variant="outline">
                <Lock /> Private
              </Badge>
            ) : (
              <Badge variant="outline">
                <Globe /> Team
              </Badge>
            )}
            {space.archived_at && <Badge variant="warning">Archived</Badge>}
          </div>
          {space.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{space.description}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
        <span>
          {people.length} member{people.length === 1 ? '' : 's'} · {stats.docs} docs · {stats.boards} boards · {stats.folders} folders
        </span>
        {people.length > 0 && <AvatarStack users={people} max={3} size="xs" />}
      </div>
    </button>
  );
}

function SpaceInspector({ spaceId, canManage, onClose }: { spaceId: string; canManage: boolean; onClose?: () => void }) {
  const { data: space, isPending } = useSpaceDetail(spaceId);
  const { data: members = [] } = useWorkspaceMembersDetailed();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const deleteEntity = useDeleteEntity();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '', space_lead: '', default_view: 'table' });
  const [access, setAccess] = useState<Record<string, SpaceRole>>({});
  const [adding, setAdding] = useState('');

  useEffect(() => {
    if (!space) return;
    setForm({
      name: space.name ?? '',
      description: space.description ?? '',
      color: space.color ?? '',
      space_lead: space.space_lead ?? '',
      default_view: space.default_view ?? 'table',
    });
    const roles: Record<string, SpaceRole> = {};
    for (const id of space.shared_members ?? []) roles[id] = space.member_roles?.[id] ?? 'contributor';
    setAccess(roles);
  }, [space]);

  const memberMap = useMemo(() => new Map(members.map((m) => [m._id, m])), [members]);
  const addable = members.filter((m) => !(m._id in access) && m._id !== space?.user_id);

  const refresh = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: ['spaces', 'detail', spaceId] }), invalidateSpaceData(queryClient)]);

  const save = async () => {
    if (!space || !form.name.trim()) return;
    setSaving(true);
    try {
      await http.put('/v1/space', {
        id: space._id,
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color || undefined,
        space_lead: form.space_lead || null,
        default_view: form.default_view,
      });
      await http.put('/v1/space/access', { shared_members: Object.entries(access).map(([user_id, role]) => ({ user_id, role })) }, { query: { id: space._id } });
      await refresh();
      toast({ variant: 'success', title: 'Space settings saved' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save space', description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const setArchived = async (archived: boolean) => {
    if (!space) return;
    try {
      await http.put('/v1/space/archive', { id: space._id, archived });
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['spaces', 'archived'] })]);
      toast({ variant: 'success', title: archived ? 'Space archived' : 'Space restored' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not update space', description: (error as Error).message });
    }
  };

  if (isPending || !space) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const Icon = entityIcon(space);
  const disabled = !canManage;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-5">
        <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40" style={form.color ? { color: form.color } : undefined}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-medium uppercase tracking-wider text-subtle">Space settings</p>
          <p className="truncate text-sm font-medium text-foreground">{space.name}</p>
        </div>
        <Badge variant="mono">{space._id.slice(-6)}</Badge>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {!canManage && <p className="rounded-md bg-muted/50 px-3 py-2 text-2xs text-muted-foreground">Only space admins and workspace admins can edit this space.</p>}
        <Field label="Name" htmlFor="sp-name">
          <Input id="sp-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={disabled} maxLength={80} />
        </Field>
        <Field label="Color">
          <div className="flex gap-2" role="radiogroup" aria-label="Space color">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={form.color === c}
                aria-label={c}
                disabled={disabled}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={cn('size-6 rounded-full ring-offset-2 ring-offset-card', form.color === c && 'ring-2 ring-foreground/60')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
        <Field label="Description" htmlFor="sp-desc">
          <Textarea id="sp-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={disabled} maxLength={300} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Space lead">
            <Select value={form.space_lead || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, space_lead: v === 'none' ? '' : v }))} disabled={disabled}>
              <SelectTrigger aria-label="Space lead">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lead</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default view">
            <Select value={form.default_view} onValueChange={(v) => setForm((f) => ({ ...f, default_view: v }))} disabled={disabled}>
              <SelectTrigger aria-label="Default view">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Members ({Object.keys(access).length + 1})</span>
            {canManage && addable.length > 0 && (
              <Select value={adding} onValueChange={(id) => { setAccess((a) => ({ ...a, [id]: 'contributor' })); setAdding(''); }}>
                <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-transparent px-2 text-2xs text-brand hover:bg-accent" aria-label="Add member">
                  <UserPlus className="size-3.5" /> Add member
                </SelectTrigger>
                <SelectContent align="end">
                  {addable.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {space.user_id && (
              <li className="flex items-center gap-2.5 px-3 py-2">
                <UserAvatar user={memberMap.get(space.user_id as string)} size="sm" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{memberMap.get(space.user_id as string)?.name ?? 'Creator'}</span>
                <Badge variant="mono">Creator</Badge>
              </li>
            )}
            {Object.entries(access).map(([id, role]) => {
              const m = memberMap.get(id);
              return (
                <li key={id} className="flex items-center gap-2.5 px-3 py-2">
                  <UserAvatar user={m} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-foreground">{m?.name || m?.email || 'Former member'}</span>
                    {m?.title && <span className="block truncate text-2xs text-muted-foreground">{m.title}</span>}
                  </span>
                  <Select value={role} onValueChange={(v) => setAccess((a) => ({ ...a, [id]: v as SpaceRole }))} disabled={disabled}>
                    <SelectTrigger className="h-7 w-[7.5rem] text-2xs" aria-label={`Space role for ${m?.name ?? id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABEL) as SpaceRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove from space"
                      onClick={() =>
                        setAccess((a) => {
                          const next = { ...a };
                          delete next[id];
                          return next;
                        })
                      }
                    >
                      <X />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {!space.is_private && <p className="text-2xs text-muted-foreground">Team spaces are visible to everyone in the workspace; roles control who can edit.</p>}
        </div>
        <p className="text-2xs text-subtle">Last updated {formatDate(space.updatedAt ?? null).toLowerCase()}</p>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => void setArchived(!space.archived_at)}>
              {space.archived_at ? <ArchiveRestore /> : <Archive />} {space.archived_at ? 'Restore' : 'Archive'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger-foreground hover:text-danger-foreground"
              onClick={() =>
                confirm({
                  title: `Delete ${space.name}?`,
                  description: 'The space moves to Trash and can be restored for 30 days.',
                  confirmLabel: 'Delete',
                  confirmVariant: 'destructive',
                  onConfirm: async () => {
                    await (deleteEntity.mutateAsync as unknown as (v: Record<string, unknown>) => Promise<unknown>)({ entityId: space._id, entityType: 'space' });
                    onClose?.();
                  },
                })
              }
            >
              <Trash2 /> Delete
            </Button>
          </div>
          <Button size="sm" disabled={saving || !form.name.trim()} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SpacesPage() {
  const { spaces, isPending } = useSpaceTree();
  const { data: members = [] } = useWorkspaceMembersDetailed();
  const { data: workspace } = useWorkspaceSettings();
  const updateWorkspace = useUpdateWorkspace();
  const isAdmin = useIsWorkspaceAdmin();
  const me = useAuthStore((s) => s.user?._id);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { data: archived = [] } = useArchivedSpaces(true);

  const memberMap = useMemo(() => new Map(members.map((m) => [m._id, m])), [members]);
  const list = useMemo(() => {
    const base = (showArchived ? [...spaces, ...archived] : spaces) as SpaceDetail[];
    const q = query.trim().toLowerCase();
    return base.filter((s) => !q || s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
  }, [spaces, archived, showArchived, query]);

  useEffect(() => {
    if (!selectedId && list.length) setSelectedId(list[0]._id);
  }, [list, selectedId]);

  const selected = list.find((s) => s._id === selectedId) ?? null;
  const canManage = (s: SpaceDetail | null) => !!s && (isAdmin || s.user_id === me || s.member_roles?.[me ?? ''] === 'manager');
  const publicCreation = workspace?.space_policies?.allow_member_public_create ?? true;

  const select = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia('(max-width: 1279px)').matches) setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        eyebrow="Spaces & access"
        title="Spaces"
        description="Organize work into spaces, decide who can create them, and manage each space's members and roles."
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus /> New space
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <PolicyCard
          title="Members can create team spaces"
          description="When off, only admins can create spaces visible to the whole workspace."
          footer={<span>{publicCreation ? 'Everyone can create' : 'Admins only'}</span>}
        >
          <Switch
            checked={publicCreation}
            disabled={!isAdmin || updateWorkspace.isPending}
            onCheckedChange={(v) => updateWorkspace.mutate({ space_policies: { ...(workspace?.space_policies ?? {}), allow_member_public_create: v } })}
            aria-label="Members can create team spaces"
          />
        </PolicyCard>
        <PolicyCard
          title="Spaces overview"
          description="Team spaces are visible to all members; private spaces only to the people in them."
          footer={
            <>
              <span>{spaces.filter((s) => !s.is_private).length} team</span>
              <span>{spaces.filter((s) => s.is_private).length} private</span>
            </>
          }
        />
        <PolicyCard
          title="Archived spaces"
          description="Archived spaces are hidden from the sidebar and search until restored."
          footer={<span>{archived.length} archived</span>}
        >
          <Switch checked={showArchived} onCheckedChange={setShowArchived} aria-label="Show archived spaces" />
        </PolicyCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-7">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search spaces…" className="h-8 pl-8 text-xs" aria-label="Search spaces" />
            </div>
            <Badge variant="mono">{list.length} spaces</Badge>
          </div>
          {isPending ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-border bg-card">
              <EmptyState icon={ShieldCheck} title="No spaces" description="Create a space to organize your team's work." />
            </div>
          ) : (
            list.map((s) => <SpaceRow key={s._id} space={s} selected={s._id === selectedId} onSelect={() => select(s._id)} members={memberMap} />)
          )}
        </div>

        <aside className="hidden xl:col-span-5 xl:block">
          <div className="sticky top-16 overflow-hidden rounded-xl border border-border bg-card">
            {selected ? (
              <SpaceInspector key={selected._id} spaceId={selected._id} canManage={canManage(selected)} />
            ) : (
              <EmptyState compact icon={ShieldCheck} title="Select a space" description="Choose a space to see its settings." />
            )}
          </div>
        </aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md" closeBtn={false}>
          <SheetTitle className="sr-only">Space settings</SheetTitle>
          {selected && <SpaceInspector key={selected._id} spaceId={selected._id} canManage={canManage(selected)} onClose={() => setSheetOpen(false)} />}
        </SheetContent>
      </Sheet>

      <AddSpaceDialog id="team-root" space_visibility={false} isOpen={addOpen} setIsOpen={setAddOpen} onEditSuccess={undefined} hideTrigger />
    </div>
  );
}
