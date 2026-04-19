import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, AlertTriangle, Users } from "lucide-react";
import useAuthStore from "@/stores/useAuthStore";
import { api } from "@/utils/api";
import { baseUrl } from "@/utils/constants";

export default function TeamsSettings() {
  const { currentWorkspace } = useAuthStore();
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", team_lead: "", shared_members: [] });

  const fetchTeams = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`${baseUrl}/v1/workspace/team`);
      if (res.status === "success") {
        setTeams(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // Teams might not exist yet
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id]);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    try {
      const res = await api.get(`${baseUrl}/v1/workspace/member`);
      if (res.status === "success" && res.data) {
        const all = [];
        if (res.data.owner) all.push(res.data.owner);
        if (res.data.members) all.push(...res.data.members);
        setMembers(all);
      }
    } catch {
      // ignore
    }
  }, [currentWorkspace?._id]);

  useEffect(() => {
    fetchTeams();
    fetchMembers();
  }, [fetchTeams, fetchMembers]);

  const openCreateDialog = () => {
    setEditingTeam(null);
    setForm({ name: "", description: "", team_lead: "", shared_members: [] });
    setDialogOpen(true);
  };

  const openEditDialog = (team) => {
    setEditingTeam(team);
    setForm({
      name: team.name || "",
      description: team.description || "",
      team_lead: team.team_lead || "",
      shared_members: team.shared_members || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        team_lead: form.team_lead || undefined,
        shared_members: form.shared_members,
      };

      let res;
      if (editingTeam) {
        res = await api.put(`${baseUrl}/v1/team`, { id: editingTeam._id, ...payload });
      } else {
        res = await api.post(`${baseUrl}/v1/team`, payload);
      }

      if (res.status === "success") {
        setDialogOpen(false);
        fetchTeams();
        setMessage({ type: "success", text: editingTeam ? "Team updated" : "Team created" });
      } else {
        const errMsg = res?.message?.[0]?.error?.[0] || "Failed to save team";
        setMessage({ type: "error", text: errMsg });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save team" });
    }
  };

  const handleDelete = async (teamId) => {
    if (!confirm("Are you sure? Members who had access only via this team will lose space access.")) return;
    try {
      const res = await api.delete(`${baseUrl}/v1/team?id=${teamId}`);
      if (res.status === "success") {
        setMessage({ type: "success", text: "Team deleted" });
        if (res.data?.affected_spaces?.length > 0) {
          const spaceNames = res.data.affected_spaces.map(s => s.space_name).join(", ");
          setMessage({ type: "success", text: `Team deleted. Access removed from spaces: ${spaceNames}` });
        }
        fetchTeams();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete team" });
    }
  };

  const toggleMember = (memberId) => {
    setForm(prev => ({
      ...prev,
      shared_members: prev.shared_members.includes(memberId)
        ? prev.shared_members.filter(id => id !== memberId)
        : [...prev.shared_members, memberId],
    }));
  };

  const getMemberName = (id) => {
    const m = members.find(m => m._id === id);
    return m?.name || m?.email || id;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-1">Create and manage teams from workspace members</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      <Separator className="my-6" />

      {message && (
        <p className={`text-sm mb-4 ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Members</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No teams yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{team.name}</span>
                      {team.description && (
                        <p className="text-xs text-muted-foreground">{team.description}</p>
                      )}
                      {(!team.shared_members || team.shared_members.length === 0) && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          No members
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {team.team_lead ? (
                      <span className="text-sm">{getMemberName(team.team_lead)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{(team.shared_members || []).length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(team)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(team._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Create Team"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Engineering"
                required
              />
            </div>
            <div>
              <Label htmlFor="team-desc">Description</Label>
              <Input
                id="team-desc"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Team Lead</Label>
              <Select
                value={form.team_lead || "none"}
                onValueChange={(v) => setForm(prev => ({ ...prev, team_lead: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Members</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workspace members available</p>
                ) : (
                  members.map(m => (
                    <label key={m._id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.shared_members.includes(m._id)}
                        onChange={() => toggleMember(m._id)}
                        className="rounded"
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.avatar} />
                        <AvatarFallback className="text-xs">{m.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.name || m.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editingTeam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
