import { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { PlusIcon, Pencil, Trash2, Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUsers, useWorkspaceMembers, useSearchUsers, useSearchWorkspaceMembers } from '@/hooks/queries/useSpacesQueries';
import { useTeams } from '@/hooks/queries/useTeamsQueries';
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/mutations/useUsersMutations';
import { useCreateTeam, useUpdateTeam, useDeleteTeam } from '@/hooks/mutations/useTeamsMutations';
import { useAddWorkspaceMember } from '@/hooks/mutations/useWorkspaceMutations';
import useAuthStore from '@/stores/useAuthStore';

// ─── User Form ────────────────────────────────────────────────────────────────

function UserFormDialog({ open, onOpenChange, user }) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'member',
  });

  // Sync form state when user prop changes (e.g. opening edit for different user)
  const handleOpen = (isOpen) => {
    if (isOpen) {
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'member',
      });
    }
    onOpenChange(isOpen);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { name: form.name, email: form.email, role: form.role };
    if (!isEdit || form.password) payload.password = form.password;

    if (isEdit) {
      updateUser.mutate(
        { userId: user._id, data: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createUser.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Member' : 'Add Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {isEdit && <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={isEdit ? 'Enter new password to change' : 'Password'}
              required={!isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Team Form Dialog ─────────────────────────────────────────────────────────

function TeamFormDialog({ open, onOpenChange, team }) {
  const isEdit = !!team;
  const { user: currentUser } = useAuthStore();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const [form, setForm] = useState({
    name: team?.name || '',
    description: team?.description || '',
    shared_members: team?.shared_members || (currentUser?._id ? [currentUser._id] : []),
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [memberMap, setMemberMap] = useState(() =>
    currentUser?._id ? { [currentUser._id]: currentUser } : {}
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMemberSearch(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const { data: memberResults = [], isFetching: fetchingMembers } = useSearchWorkspaceMembers(debouncedMemberSearch);

  const handleOpen = (isOpen) => {
    if (isOpen) {
      setForm({
        name: team?.name || '',
        description: team?.description || '',
        shared_members: team?.shared_members || (currentUser?._id ? [currentUser._id] : []),
      });
      setMemberSearch('');
      setDebouncedMemberSearch('');
      // Seed map with current user so their badge shows email, not raw ID
      if (currentUser?._id) {
        setMemberMap({ [currentUser._id]: currentUser });
      } else {
        setMemberMap({});
      }
    }
    onOpenChange(isOpen);
  };

  const toggleMember = (u) => {
    setMemberMap((prev) => ({ ...prev, [u._id]: u }));
    setForm((prev) => ({
      ...prev,
      shared_members: prev.shared_members.includes(u._id)
        ? prev.shared_members.filter((id) => id !== u._id)
        : [...prev.shared_members, u._id],
    }));
  };

  const removeMember = (userId) => {
    if (currentUser && userId === currentUser._id) return;
    setForm((prev) => ({ ...prev, shared_members: prev.shared_members.filter((id) => id !== userId) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      updateTeam.mutate(
        { teamId: team._id, data: form },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createTeam.mutate(form, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createTeam.isPending || updateTeam.isPending;
  const showMemberDropdown = memberDropdownOpen && debouncedMemberSearch.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Team' : 'Add Team'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Members</Label>
            <div className="relative">
              <Input
                placeholder="Search workspace members..."
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setMemberDropdownOpen(true); }}
                onFocus={() => setMemberDropdownOpen(true)}
                onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 150)}
                autoComplete="off"
              />
              {showMemberDropdown && (
                <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                  {fetchingMembers ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                  ) : memberResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No members found.</div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {memberResults.map((u) => (
                        <li
                          key={u._id}
                          onMouseDown={(e) => { e.preventDefault(); toggleMember(u); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              form.shared_members.includes(u._id) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{u.email}</span>
                            {u.name && (
                              <span className="text-xs text-muted-foreground truncate">{u.name}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {form.shared_members.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.shared_members.map((memberId) => {
                  const u = memberMap[memberId];
                  
                  return (
                    <Badge key={memberId} variant="secondary" className="flex items-center gap-1">
                      {u?.email || u?.name || memberId}
                      {currentUser?._id === memberId ? (
                        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                      ) : (
                        <button type="button" onClick={() => removeMember(memberId)}>
                          <XIcon className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Workspace Member Dialog ─────────────────────────────────────────────

function AddWorkspaceMemberDialog({ open, onOpenChange }) {
  const addMember = useAddWorkspaceMember();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  /** @type {[Array<{_id: string, email: string, name?: string}>, Function]} */
  const [selected, setSelected] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: searchResults = [], isFetching } = useSearchUsers(debouncedSearch);

  const handleOpen = (isOpen) => {
    if (!isOpen) {
      setSearch('');
      setDebouncedSearch('');
      setSelected([]);
      setDropdownOpen(false);
    }
    onOpenChange(isOpen);
  };

  const toggleUser = (user) => {
    setSelected((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let completed = 0;
    selected.forEach((user) => {
      addMember.mutate(
        { email: user.email },
        {
          onSettled: () => {
            completed++;
            if (completed === selected.length) handleOpen(false);
          },
        }
      );
    });
  };

  const showDropdown = dropdownOpen && (isFetching || debouncedSearch.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member to Workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Search users by email</Label>
            <div className="relative">
              <Input
                placeholder="Type email to search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                autoComplete="off"
              />
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                  {isFetching ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No users found.</div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {searchResults.map((u) => (
                        <li
                          key={u._id}
                          onMouseDown={(e) => { e.preventDefault(); toggleUser(u); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                          <Check
                            className={cn(
                              'h-4 w-4 shrink-0',
                              selected.some((s) => s._id === u._id) ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{u.email}</span>
                            {u.name && (
                              <span className="text-xs text-muted-foreground truncate">{u.name}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map((u) => (
                <Badge key={u._id} variant="secondary" className="flex items-center gap-1">
                  {u.email}
                  <button type="button" onClick={() => toggleUser(u)}>
                    <XIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addMember.isPending || selected.length === 0}>
              {addMember.isPending
                ? 'Adding...'
                : `Add ${selected.length > 1 ? `${selected.length} ` : ''}Member${selected.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmDialog({ open, onOpenChange, onConfirm, count = 1, isPending }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {count > 1
              ? `This will permanently delete ${count} items.`
              : 'This will permanently delete this item.'}
            {' '}This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab() {
  const { data: users = [], isLoading } = useWorkspaceMembers();
  const deleteUser = useDeleteUser();

  const [selected, setSelected] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, ids: [] });
  const [memberDialog, setMemberDialog] = useState(false);

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === users.length ? [] : users.map((u) => u._id));
  };

  const openEdit = (user) => {};
  const openDeleteSingle = (id) => setDeleteDialog({ open: true, ids: [id] });
  const openDeleteBulk = () => setDeleteDialog({ open: true, ids: selected });

  const handleDeleteConfirm = () => {
    const ids = deleteDialog.ids;
    let completed = 0;
    ids.forEach((id) => {
      deleteUser.mutate(id, {
        onSettled: () => {
          completed++;
          if (completed === ids.length) {
            setDeleteDialog({ open: false, ids: [] });
            setSelected([]);
          }
        },
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {selected.length > 0 && (
            <Button variant="destructive" size="sm" onClick={openDeleteBulk}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selected.length} selected
            </Button>
          )}
        </div>
        <Button onClick={() => setMemberDialog(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={users.length > 0 && selected.length === users.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Loading members...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No members found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(user._id)}
                    onCheckedChange={() => toggleSelect(user._id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{user.name || '—'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="destructive" size="sm" onClick={() => openDeleteSingle(user._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddWorkspaceMemberDialog
        open={memberDialog}
        onOpenChange={setMemberDialog}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleDeleteConfirm}
        count={deleteDialog.ids.length}
        isPending={deleteUser.isPending}
      />
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────

function TeamsTab() {
  const { data: teams = [], isLoading } = useTeams();
  const deleteTeam = useDeleteTeam();

  const [selected, setSelected] = useState([]);
  const [teamDialog, setTeamDialog] = useState({ open: false, team: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, ids: [] });

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(selected.length === teams.length ? [] : teams.map((t) => t._id));
  };

  const openAdd = () => setTeamDialog({ open: true, team: null });
  const openEdit = (team) => setTeamDialog({ open: true, team });
  const openDeleteSingle = (id) => setDeleteDialog({ open: true, ids: [id] });
  const openDeleteBulk = () => setDeleteDialog({ open: true, ids: selected });

  const handleDeleteConfirm = () => {
    const ids = deleteDialog.ids;
    let completed = 0;
    ids.forEach((id) => {
      deleteTeam.mutate(id, {
        onSettled: () => {
          completed++;
          if (completed === ids.length) {
            setDeleteDialog({ open: false, ids: [] });
            setSelected([]);
          }
        },
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {selected.length > 0 && (
            <Button variant="destructive" size="sm" onClick={openDeleteBulk}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selected.length} selected
            </Button>
          )}
        </div>
        <Button onClick={openAdd}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Team
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={teams.length > 0 && selected.length === teams.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Members</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                Loading teams...
              </TableCell>
            </TableRow>
          ) : teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No teams found.
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team) => (
              <TableRow key={team._id}>
                <TableCell>
                  <Checkbox
                    checked={selected.includes(team._id)}
                    onCheckedChange={() => toggleSelect(team._id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {team.description || '—'}
                </TableCell>
                <TableCell>{team.shared_members?.length || 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(team)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteSingle(team._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TeamFormDialog
        open={teamDialog.open}
        onOpenChange={(open) => setTeamDialog((prev) => ({ ...prev, open }))}
        team={teamDialog.team}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleDeleteConfirm}
        count={deleteDialog.ids.length}
        isPending={deleteTeam.isPending}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users &amp; Teams</h1>
        <p className="text-muted-foreground">Manage members and teams in your organization</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersTab />
        </TabsContent>

        <TabsContent value="teams">
          <TeamsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
