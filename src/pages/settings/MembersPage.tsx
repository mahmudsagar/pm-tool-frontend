import { useMemo, useState, type FormEvent } from 'react';
import { Ban, Check, Copy, Download, Contact, Link2, Mail, MoreVertical, RefreshCw, RotateCcw, Search, ShieldCheck, UserPlus, UserRound, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import useDialog from '@/hooks/useDialog';
import useAuthStore from '@/stores/useAuthStore';
import { useSpaceTree } from '@/features/spaces/queries';
import { formatDate } from '@/features/files/formatDate';
import { SettingsHeader, StatCard } from '@/features/settings/components';
import {
  inviteLink,
  useBulkUpdateMembers,
  useInvitations,
  useInviteMembers,
  useIsWorkspaceAdmin,
  useRemoveMember,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateMember,
  useWorkspaceMembersDetailed,
  type Invitation,
  type InviteResult,
  type WorkspaceMember,
  type WorkspaceRoleName,
} from '@/features/settings/queries';

type AssignableRole = Exclude<WorkspaceRoleName, 'owner'>;

const ROLE_META: Record<WorkspaceRoleName, { label: string; dot: string; summary: string; scope: string }> = {
  owner: { label: 'Owner', dot: 'bg-brand', summary: 'Full control, including billing, ownership transfer and deleting the workspace.', scope: 'Root access' },
  admin: { label: 'Admin', dot: 'bg-info', summary: 'Manage members, invitations, spaces and workspace settings.', scope: 'Manage' },
  member: { label: 'Member', dot: 'bg-muted-foreground', summary: 'Create and edit docs, sheets, boards and whiteboards in spaces they can access.', scope: 'Read / write' },
  guest: { label: 'Guest', dot: 'bg-warning', summary: 'Limited access to spaces and items explicitly shared with them.', scope: 'Limited' },
};

const PAGE_SIZE = 10;

function activityLabel(member: WorkspaceMember) {
  if (!member.last_seen_at) return '—';
  const minutes = (Date.now() - new Date(member.last_seen_at).getTime()) / 60000;
  if (minutes < 5) return 'Active now';
  return `Active ${formatDate(member.last_seen_at).toLowerCase()}`;
}

function RoleSelect({ member, disabled, onChange }: { member: WorkspaceMember; disabled: boolean; onChange: (role: AssignableRole) => void }) {
  const meta = ROLE_META[member.workspace_role];
  if (member.workspace_role === 'owner' || disabled) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-2xs font-medium text-foreground">
        <span className={cn('size-1.5 rounded-full', meta.dot)} />
        {meta.label}
      </span>
    );
  }
  return (
    <Select value={member.workspace_role} onValueChange={(v) => onChange(v as AssignableRole)}>
      <SelectTrigger className="h-7 w-[7.5rem] rounded-full px-2.5 text-2xs" aria-label={`Role for ${member.name || member.email}`}>
        <span className="flex items-center gap-1.5">
          <span className={cn('size-1.5 rounded-full', meta.dot)} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {(['admin', 'member', 'guest'] as const).map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_META[r].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SpaceChips({ ids, names }: { ids: string[]; names: Map<string, string> }) {
  const known = ids.map((id) => names.get(id)).filter((n): n is string => !!n);
  if (known.length === 0) return <span className="text-xs text-subtle">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {known.slice(0, 2).map((n) => (
        <Badge key={n} variant="tag" className="max-w-[9rem] truncate">
          {n}
        </Badge>
      ))}
      {known.length > 2 && <Badge variant="mono">+{known.length - 2}</Badge>}
    </div>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { spaces } = useSpaceTree();
  const invite = useInviteMembers();
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<AssignableRole>('member');
  const [spaceIds, setSpaceIds] = useState<string[]>([]);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const parsed = Array.from(new Set(emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)));
  const invalid = parsed.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const reset = () => {
    setEmails('');
    setRole('member');
    setSpaceIds([]);
    setResults(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.length || invalid.length) return;
    try {
      const response = await invite.mutateAsync({ emails: parsed, role, space_ids: spaceIds });
      setResults(response?.results ?? []);
    } catch {
      // Toast already shown.
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard unavailable.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite members</DialogTitle>
          <DialogDescription>
            Existing users join right away. New people join automatically when they sign up with the invited email, or you can share their invite link.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-3">
            <ul className="divide-y divide-border rounded-lg border border-border">
              {results.map((r) => (
                <li key={r.email} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-foreground">{r.email}</span>
                  {r.outcome === 'added' && <Badge variant="success">Added</Badge>}
                  {r.outcome === 'invited' && <Badge variant="info">Invited</Badge>}
                  {r.outcome === 'skipped' && (
                    <Badge variant="outline" title={r.reason}>
                      {r.reason || 'Skipped'}
                    </Badge>
                  )}
                  {r.invitation?.token && (
                    <Button variant="ghost" size="xs" onClick={() => void copy(r.invitation?.token ?? "")}>
                      {copied === r.invitation.token ? <Check /> : <Link2 />} Copy link
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Invite more
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="invite-emails" className="text-xs font-medium text-foreground">
                Emails
              </label>
              <Textarea
                id="invite-emails"
                rows={3}
                autoFocus
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="alex@company.com, sam@company.com"
                aria-invalid={invalid.length > 0}
              />
              <p className={cn('text-2xs', invalid.length ? 'text-danger-foreground' : 'text-muted-foreground')}>
                {invalid.length ? `Check: ${invalid.join(', ')}` : `${parsed.length} recipient${parsed.length === 1 ? '' : 's'} · separate with commas or new lines`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">Role</span>
                <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
                  <SelectTrigger aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'member', 'guest'] as const).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_META[r].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">Add to spaces</span>
                <Select
                  value=""
                  onValueChange={(id) => setSpaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                >
                  <SelectTrigger aria-label="Add to spaces">
                    <span className="text-subtle">{spaceIds.length ? `${spaceIds.length} selected` : 'Optional'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.filter((s) => !s.is_private).map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {spaceIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {spaceIds.map((id) => (
                  <Badge key={id} variant="tag" className="gap-1 pr-1">
                    {spaces.find((s) => s._id === id)?.name}
                    <button type="button" aria-label="Remove space" onClick={() => setSpaceIds((prev) => prev.filter((x) => x !== id))}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!parsed.length || invalid.length > 0 || invite.isPending}>
                <UserPlus /> {invite.isPending ? 'Sending…' : `Invite ${parsed.length || ''}`.trim()}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvitationRow({ invitation, isAdmin }: { invitation: Invitation; isAdmin: boolean }) {
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const { toast } = useToast();
  const copy = async () => {
    if (!invitation.token) return;
    try {
      await navigator.clipboard.writeText(inviteLink(invitation.token));
      toast({ variant: 'success', title: 'Invite link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };
  return (
    <tr className="bg-warning/[0.03]">
      <td className="hidden w-10 py-3 pl-4 md:table-cell" />
      <td className="py-3 pl-4 pr-3 md:pl-0">
        <div className="flex items-center gap-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
            <Mail className="size-4" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-warning ring-2 ring-card" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
              {invitation.email}
              <Badge variant="warning">Pending</Badge>
            </p>
            <p className="truncate text-2xs text-muted-foreground">
              Invited {formatDate(invitation.created_at).toLowerCase()}
              {invitation.invited_by?.name && ` by ${invitation.invited_by.name}`}
            </p>
          </div>
        </div>
      </td>
      <td className="hidden py-3 pr-3 sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-2xs text-foreground">
          <span className={cn('size-1.5 rounded-full', ROLE_META[invitation.role].dot)} />
          {ROLE_META[invitation.role].label}
        </span>
      </td>
      <td className="hidden py-3 pr-3 lg:table-cell">
        <span className="text-2xs text-muted-foreground">{invitation.space_ids.length ? `${invitation.space_ids.length} space(s)` : '—'}</span>
      </td>
      <td className="hidden py-3 pr-3 text-2xs text-warning-foreground sm:table-cell">Expires {new Date(invitation.expires_at).toLocaleDateString()}</td>
      <td className="py-3 pr-3">
        {isAdmin && (
          <div className="flex justify-end gap-1">
            {invitation.token && (
              <Button variant="ghost" size="icon-xs" className="hidden sm:inline-flex" aria-label="Copy invite link" onClick={() => void copy()}>
                <Copy />
              </Button>
            )}
            <Button variant="outline" size="xs" disabled={resend.isPending} onClick={() => resend.mutate(invitation._id)}>
              Renew
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Revoke invitation" onClick={() => revoke.mutate(invitation._id)}>
              <X />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function MembersPage() {
  const me = useAuthStore((s) => s.user?._id);
  const isAdmin = useIsWorkspaceAdmin();
  const { data: members = [], isPending, error, refetch, isFetching } = useWorkspaceMembersDetailed();
  const { data: invitations = [] } = useInvitations(isAdmin);
  const { spaces } = useSpaceTree();
  const updateMember = useUpdateMember();
  const bulk = useBulkUpdateMembers();
  const removeMember = useRemoveMember();
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | WorkspaceRoleName>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);

  const spaceNames = useMemo(() => new Map(spaces.map((s) => [s._id, s.name])), [spaces]);
  const counts = useMemo(() => {
    const c = { total: members.length, owner: 0, admin: 0, member: 0, guest: 0 };
    for (const m of members) c[m.workspace_role] += 1;
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) =>
        (roleFilter === 'all' || m.workspace_role === roleFilter) &&
        (statusFilter === 'all' || (m.status ?? 'active') === statusFilter) &&
        (!q || [m.name, m.email, m.title, m.handle, ROLE_META[m.workspace_role].label].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [members, query, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectable = visible.filter((m) => m.workspace_role !== 'owner' && m._id !== me);
  const allSelected = selectable.length > 0 && selectable.every((m) => selected.has(m._id));
  const selectedIds = [...selected];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportCsv = () => {
    const rows = [['Name', 'Email', 'Role', 'Status', 'Title', 'Spaces', 'Last active']];
    for (const m of members) {
      rows.push([
        m.name ?? '',
        m.email ?? '',
        ROLE_META[m.workspace_role].label,
        m.status ?? 'active',
        m.title ?? '',
        (m.space_ids ?? []).map((id) => spaceNames.get(id) ?? id).join('; '),
        m.last_seen_at ?? '',
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'members.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmRemove = (m: WorkspaceMember) =>
    confirm({
      title: `Remove ${m.name || m.email}?`,
      description: 'They lose access to this workspace immediately. Their documents stay.',
      confirmLabel: 'Remove',
      confirmVariant: 'destructive',
      onConfirm: () => removeMember.mutateAsync(m._id),
    });

  return (
    <div className="space-y-6">
      <SettingsHeader
        eyebrow="Directory & access"
        title="Members & roles"
        description="Manage who can access this workspace, what they can do, and pending invitations."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!members.length}>
              <Download /> Export CSV
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus /> Invite members
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total members" value={counts.total} icon={Users} />
        <StatCard label="Admins" value={counts.admin + counts.owner} sub={counts.total ? `${Math.round(((counts.admin + counts.owner) / counts.total) * 100)}%` : undefined} icon={ShieldCheck} />
        <StatCard label="Members" value={counts.member} sub="Standard" icon={Contact} />
        <StatCard label="Guests" value={counts.guest} sub="Limited" icon={UserRound} tone="warning" />
        <StatCard label="Pending invites" value={isAdmin ? invitations.length : '—'} sub={isAdmin ? 'Awaiting' : undefined} icon={Mail} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name, email or role…"
            className="h-8 pl-8 text-xs"
            aria-label="Search members"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as typeof roleFilter); setPage(0); }}>
            <SelectTrigger className="h-8 w-[9rem] text-xs" aria-label="Role filter">
              <span className="text-subtle">Role:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(['owner', 'admin', 'member', 'guest'] as const).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_META[r].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(0); }}>
            <SelectTrigger className="h-8 w-[9.5rem] text-xs" aria-label="Status filter">
              <span className="text-subtle">Status:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {isAdmin && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="xs">
                  <ShieldCheck /> Change role
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['admin', 'member', 'guest'] as const).map((r) => (
                  <DropdownMenuItem key={r} onSelect={() => bulk.mutate({ user_ids: selectedIds, role: r }, { onSuccess: () => setSelected(new Set()) })}>
                    {ROLE_META[r].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="xs" onClick={() => bulk.mutate({ user_ids: selectedIds, status: 'active' }, { onSuccess: () => setSelected(new Set()) })}>
              <RotateCcw /> Restore access
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() =>
                confirm({
                  title: `Suspend ${selected.size} member${selected.size === 1 ? '' : 's'}?`,
                  description: 'Suspended members can’t open this workspace until access is restored.',
                  confirmLabel: 'Suspend',
                  confirmVariant: 'destructive',
                  onConfirm: () => bulk.mutateAsync({ user_ids: selectedIds, status: 'suspended' }).then(() => setSelected(new Set())),
                })
              }
            >
              <Ban /> Suspend
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>
              Deselect
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 && invitations.length === 0 ? (
          <EmptyState icon={Users} title="No members match" description="Try a different search or filter." />
        ) : (
          <table className="w-full table-fixed text-left">
            <thead className="hidden border-b border-border bg-muted/30 md:table-header-group">
              <tr className="text-2xs font-medium uppercase tracking-wider text-subtle">
                <th className="w-10 py-2.5 pl-4">
                  {isAdmin && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          selectable.forEach((m) => (allSelected ? next.delete(m._id) : next.add(m._id)));
                          return next;
                        })
                      }
                      aria-label="Select all"
                    />
                  )}
                </th>
                <th className="py-2.5 pr-3 font-medium">Member</th>
                <th className="hidden w-36 py-2.5 pr-3 font-medium sm:table-cell">Role</th>
                <th className="hidden w-56 py-2.5 pr-3 font-medium lg:table-cell">Spaces</th>
                <th className="hidden w-36 py-2.5 pr-3 font-medium sm:table-cell">Activity</th>
                <th className="w-14 py-2.5 pr-3 sm:w-36">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((m) => {
                const isMe = m._id === me;
                const suspended = m.status === 'suspended';
                const canEdit = isAdmin && !isMe && m.workspace_role !== 'owner';
                return (
                  <tr key={m._id} className={cn('transition-colors hover:bg-accent/30', selected.has(m._id) && 'bg-brand/5', suspended && 'opacity-70')}>
                    <td className="hidden w-10 py-3 pl-4 md:table-cell">
                      {canEdit && <Checkbox checked={selected.has(m._id)} onCheckedChange={() => toggle(m._id)} aria-label={`Select ${m.name || m.email}`} />}
                    </td>
                    <td className="py-3 pl-4 pr-3 md:pl-0">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <UserAvatar user={m} size="lg" />
                          {activityLabel(m) === 'Active now' && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-card" />}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                            {m.name || m.email}
                            {isMe && <Badge variant="mono">You</Badge>}
                            {suspended && <Badge variant="destructive">Suspended</Badge>}
                          </p>
                          <p className="truncate text-2xs text-muted-foreground">
                            <span className="sm:hidden">{ROLE_META[m.workspace_role].label} · </span>
                            {[m.title, m.email].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-3 pr-3 sm:table-cell">
                      <RoleSelect member={m} disabled={!canEdit} onChange={(role) => updateMember.mutate({ user_id: m._id, role })} />
                    </td>
                    <td className="hidden py-3 pr-3 lg:table-cell">
                      <SpaceChips ids={m.space_ids ?? []} names={spaceNames} />
                    </td>
                    <td className={cn('hidden py-3 pr-3 text-xs sm:table-cell', activityLabel(m) === 'Active now' ? 'text-brand' : 'text-muted-foreground')}>
                      {activityLabel(m)}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.name || m.email}`}>
                              <MoreVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Role</DropdownMenuLabel>
                            {(['admin', 'member', 'guest'] as const).map((r) => (
                              <DropdownMenuItem key={r} disabled={m.workspace_role === r} onSelect={() => updateMember.mutate({ user_id: m._id, role: r })}>
                                {ROLE_META[r].label}
                                {m.workspace_role === r && <Check className="ml-auto" />}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => updateMember.mutate({ user_id: m._id, status: suspended ? 'active' : 'suspended' })}>
                              {suspended ? <RotateCcw /> : <Ban />} {suspended ? 'Restore access' : 'Suspend access'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-danger-foreground focus:text-danger-foreground" onSelect={() => confirmRemove(m)}>
                              <X /> Remove from workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
              {isAdmin && page === pageCount - 1 && invitations.map((inv) => <InvitationRow key={inv._id} invitation={inv} isAdmin={isAdmin} />)}
            </tbody>
          </table>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="font-mono text-2xs">
                {page + 1} / {pageCount}
              </span>
              <Button variant="outline" size="xs" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium text-foreground">Roles &amp; permissions</h2>
            <p className="text-xs text-muted-foreground">Workspace roles. Space access can be narrowed further in each space&apos;s settings.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(['owner', 'admin', 'member', 'guest'] as const).map((r) => (
            <div key={r} className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{ROLE_META[r].label}</h3>
                <span className={cn('size-2 rounded-full', ROLE_META[r].dot)} />
              </div>
              <p className="flex-1 text-xs text-muted-foreground">{ROLE_META[r].summary}</p>
              <div className="flex items-center justify-between text-2xs">
                <span className="text-muted-foreground">{counts[r]} active</span>
                <span className="font-mono text-subtle">{ROLE_META[r].scope}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
