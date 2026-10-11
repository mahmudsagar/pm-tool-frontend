import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MoreHorizontal, PencilLine, Plus, Search, Trash2, Users, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar, AvatarStack } from '@/components/common/UserAvatar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import useDialog from '@/hooks/useDialog';
import { http } from '@/lib/api/client';
import { Field, SettingsHeader } from '@/features/settings/components';
import { useIsWorkspaceAdmin, useWorkspaceMembersDetailed, type WorkspaceMember } from '@/features/settings/queries';

interface Team {
  _id: string;
  name: string;
  description?: string;
  team_lead?: string;
  shared_members?: string[];
  createdAt?: string;
}

interface TeamForm {
  name: string;
  description: string;
  team_lead: string;
  shared_members: string[];
}

function useTeamsList() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => (await http.get<Team[]>('/v1/workspace/team')) ?? [],
  });
}

function useSaveTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...data }: TeamForm & { id?: string }) => {
      const payload = { ...data, team_lead: data.team_lead || undefined };
      return id ? http.put('/v1/team', { id, ...payload }) : http.post('/v1/team', payload);
    },
    onSuccess: (_d, v) => toast({ variant: 'success', title: v.id ? 'Team updated' : 'Team created' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not save team', description: (error as Error).message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => http.delete('/v1/team', { query: { id } }),
    onSuccess: () => toast({ title: 'Team deleted' }),
    onError: (error) => toast({ variant: 'destructive', title: 'Could not delete team', description: (error as Error).message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });
}

function TeamDialog({ team, open, onOpenChange, members }: { team: Team | null; open: boolean; onOpenChange: (o: boolean) => void; members: WorkspaceMember[] }) {
  const save = useSaveTeam();
  const blank: TeamForm = { name: '', description: '', team_lead: '', shared_members: [] };
  const [form, setForm] = useState<TeamForm>(blank);

  const reset = () =>
    setForm(team ? { name: team.name, description: team.description ?? '', team_lead: team.team_lead ?? '', shared_members: team.shared_members ?? [] } : blank);

  const toggleMember = (id: string) =>
    setForm((f) => ({ ...f, shared_members: f.shared_members.includes(id) ? f.shared_members.filter((x) => x !== id) : [...f.shared_members, id] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await save.mutateAsync({ ...form, name: form.name.trim(), description: form.description.trim(), id: team?._id });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit team' : 'New team'}</DialogTitle>
          <DialogDescription>Teams let you share spaces and items with a group in one step.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Team name" htmlFor="team-name">
            <Input id="team-name" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} />
          </Field>
          <Field label="Description" htmlFor="team-desc">
            <Textarea id="team-desc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={300} />
          </Field>
          <Field label="Team lead">
            <Select value={form.team_lead || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, team_lead: v === 'none' ? '' : v, shared_members: v !== 'none' && !f.shared_members.includes(v) ? [...f.shared_members, v] : f.shared_members }))}>
              <SelectTrigger aria-label="Team lead">
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
          <Field label={`Members (${form.shared_members.length})`}>
            <Command className="rounded-lg border border-border bg-background">
              <CommandInput placeholder="Search members…" />
              <CommandList className="max-h-48">
                <CommandEmpty>No members found.</CommandEmpty>
                {members.map((m) => (
                  <CommandItem key={m._id} value={`${m.name ?? ''} ${m.email ?? ''}`} onSelect={() => toggleMember(m._id)}>
                    <UserAvatar user={m} size="xs" />
                    <span className="flex-1 truncate">{m.name || m.email}</span>
                    {form.shared_members.includes(m._id) && <Check className="!text-brand" />}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : team ? 'Save team' : 'Create team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamsPage() {
  const { data: teams = [], isPending, error, refetch } = useTeamsList();
  const { data: members = [] } = useWorkspaceMembersDetailed();
  const isAdmin = useIsWorkspaceAdmin();
  const remove = useDeleteTeam();
  const { confirm } = useDialog() as { confirm: (o: Record<string, unknown>) => void };
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Team | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const memberMap = useMemo(() => new Map(members.map((m) => [m._id, m])), [members]);
  const filtered = teams.filter((t) => !query.trim() || t.name.toLowerCase().includes(query.trim().toLowerCase()));

  const open = (team: Team | null) => {
    setEditing(team);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <SettingsHeader
        eyebrow="Groups"
        title="Teams"
        description="Group people who work together so you can share spaces, boards and documents with everyone at once."
        actions={
          isAdmin && (
            <Button size="sm" onClick={() => open(null)}>
              <Plus /> New team
            </Button>
          )
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams…" className="h-8 pl-8 text-xs" aria-label="Search teams" />
        </div>
        <Badge variant="mono">{teams.length} teams</Badge>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={UsersRound}
            title={query ? 'No teams match' : 'No teams yet'}
            description={query ? 'Try a different search.' : 'Create a team to share work with a group in one step.'}
            action={
              isAdmin && !query && (
                <Button size="sm" onClick={() => open(null)}>
                  <Plus /> New team
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((team) => {
            const people = (team.shared_members ?? []).map((id) => memberMap.get(id)).filter((m): m is WorkspaceMember => !!m);
            const lead = team.team_lead ? memberMap.get(team.team_lead) : undefined;
            return (
              <article key={team._id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
                <header className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                    <Users className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-foreground">{team.name}</h3>
                    <p className="text-2xs text-muted-foreground">
                      {people.length} member{people.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${team.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => open(team)}>
                          <PencilLine /> Edit team
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-danger-foreground focus:text-danger-foreground"
                          onSelect={() =>
                            confirm({
                              title: `Delete ${team.name}?`,
                              description: 'Spaces and items shared with this team lose that access. People stay in the workspace.',
                              confirmLabel: 'Delete',
                              confirmVariant: 'destructive',
                              onConfirm: () => remove.mutateAsync(team._id),
                            })
                          }
                        >
                          <Trash2 /> Delete team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </header>
                {team.description && <p className="line-clamp-2 text-xs text-muted-foreground">{team.description}</p>}
                <footer className="mt-auto flex items-center justify-between border-t border-border pt-3 text-2xs text-muted-foreground">
                  {lead ? (
                    <span className="flex items-center gap-1.5">
                      <UserAvatar user={lead} size="xs" /> Lead: {lead.name || lead.email}
                    </span>
                  ) : (
                    <span>No lead</span>
                  )}
                  {people.length > 0 && <AvatarStack users={people} max={4} size="xs" />}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <TeamDialog team={editing} open={dialogOpen} onOpenChange={setDialogOpen} members={members} />
    </div>
  );
}
