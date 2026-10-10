import { useMemo, useState } from 'react';
import { Check, Plus, Users, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { UserAvatar, type AvatarUser } from '@/components/common/UserAvatar';
import { useWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';
import { useTeams } from '@/hooks/queries/useTeamsQueries';
import useAuthStore from '@/stores/useAuthStore';
import { ensureArray } from '@/utils/helper';

interface Team {
  _id: string;
  name: string;
  shared_members?: string[];
}

interface AccessPickerProps {
  members: string[];
  teams: string[];
  onMembersChange: (ids: string[]) => void;
  onTeamsChange: (ids: string[]) => void;
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** Pick workspace members and teams to share an item with. */
export function AccessPicker({ members, teams, onMembersChange, onTeamsChange }: AccessPickerProps) {
  const [open, setOpen] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?._id);
  const { data: memberData } = useWorkspaceMembers();
  const { data: teamData } = useTeams();

  const allMembers = useMemo(
    () => (ensureArray(memberData) as (AvatarUser & { _id: string })[]).filter((m) => m._id !== currentUserId),
    [memberData, currentUserId],
  );
  const allTeams = ensureArray(teamData) as Team[];

  const selectedMembers = allMembers.filter((m) => members.includes(m._id));
  const selectedTeams = allTeams.filter((t) => teams.includes(t._id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground">
            <Plus />
            Add people or teams
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search by name or email…" />
            <CommandList className="max-h-64">
              <CommandEmpty>No matches.</CommandEmpty>
              {allTeams.length > 0 && (
                <CommandGroup heading="Teams">
                  {allTeams.map((team) => (
                    <CommandItem key={team._id} value={`team ${team.name}`} onSelect={() => onTeamsChange(toggle(teams, team._id))}>
                      <Users />
                      <span className="flex-1 truncate">{team.name}</span>
                      <span className="font-mono text-2xs text-subtle">{team.shared_members?.length ?? 0}</span>
                      {teams.includes(team._id) && <Check className="!text-brand" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="Members">
                {allMembers.map((member) => (
                  <CommandItem
                    key={member._id}
                    value={`${member.name ?? ''} ${member.email ?? ''}`}
                    onSelect={() => onMembersChange(toggle(members, member._id))}
                  >
                    <UserAvatar user={member} size="xs" />
                    <span className="flex-1 truncate">{member.name || member.email}</span>
                    {members.includes(member._id) && <Check className="!text-brand" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {(selectedMembers.length > 0 || selectedTeams.length > 0) && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {selectedTeams.map((team) => (
            <AccessRow
              key={team._id}
              leading={
                <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Users className="size-3.5" />
                </span>
              }
              title={team.name}
              subtitle={`Team · ${team.shared_members?.length ?? 0} members`}
              onRemove={() => onTeamsChange(teams.filter((id) => id !== team._id))}
            />
          ))}
          {selectedMembers.map((member) => (
            <AccessRow
              key={member._id}
              leading={<UserAvatar user={member} size="sm" />}
              title={member.name || member.email || 'Member'}
              subtitle={member.email}
              onRemove={() => onMembersChange(members.filter((id) => id !== member._id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AccessRow({ leading, title, subtitle, onRemove }: { leading: React.ReactNode; title: string; subtitle?: string; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-2.5 px-3 py-2">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{title}</p>
        {subtitle && <p className="truncate text-2xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label={`Remove ${title}`}>
        <X />
      </Button>
    </li>
  );
}
