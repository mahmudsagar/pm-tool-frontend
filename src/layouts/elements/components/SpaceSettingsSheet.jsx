import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, AlertTriangle, Shield } from "lucide-react";
import { api } from "@/utils/api";
import { baseUrl } from "@/utils/constants";

const VIEWS = [
  { value: "table", label: "Table" },
  { value: "timeline", label: "Timeline" },
  { value: "calendar", label: "Calendar" },
  { value: "kanban", label: "Kanban" },
];

const SPACE_ROLES = ["manager", "contributor", "viewer"];

const ROLE_DESCRIPTIONS = {
  manager: "Edit space settings, manage members, full task access",
  contributor: "Create and edit tasks, manage own work, comment",
  viewer: "Read only, can comment",
};

export default function SpaceSettingsSheet({ spaceId, space, open, onOpenChange }) {
  const [form, setForm] = useState({
    name: "",
    color: "#6366f1",
    icon: "",
    default_view: "table",
    space_lead: "",
    working_start_date: "",
    working_end_date: "",
  });
  const [accessData, setAccessData] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState("settings");

  // Add member/team state
  const [addType, setAddType] = useState("member");
  const [addId, setAddId] = useState("");
  const [addRole, setAddRole] = useState("contributor");

  useEffect(() => {
    if (space && open) {
      setForm({
        name: space.name || "",
        color: space.color || "#6366f1",
        icon: space.icon || "",
        default_view: space.default_view || "table",
        space_lead: space.space_lead || "",
        working_start_date: space.working_start_date ? space.working_start_date.split("T")[0] : "",
        working_end_date: space.working_end_date ? space.working_end_date.split("T")[0] : "",
      });
    }
  }, [space, open]);

  const fetchAccess = useCallback(async () => {
    if (!spaceId || !open) return;
    try {
      const res = await api.get(`${baseUrl}/v1/space/access?id=${spaceId}`);
      if (res.status === "success") {
        setAccessData(res.data);
      }
    } catch {
      // ignore
    }
  }, [spaceId, open]);

  const fetchWorkspaceData = useCallback(async () => {
    if (!open) return;
    try {
      const [membersRes, teamsRes] = await Promise.all([
        api.get(`${baseUrl}/v1/workspace/member`),
        api.get(`${baseUrl}/v1/workspace/team`).catch(() => ({ data: [] })),
      ]);
      if (membersRes.status === "success" && membersRes.data) {
        const all = [];
        if (membersRes.data.owner) all.push(membersRes.data.owner);
        if (membersRes.data.members) all.push(...membersRes.data.members);
        setMembers(all);
      }
      if (teamsRes.status === "success") {
        setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      }
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    fetchAccess();
    fetchWorkspaceData();
  }, [fetchAccess, fetchWorkspaceData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`${baseUrl}/v1/space`, {
        id: spaceId,
        name: form.name,
        color: form.color,
        icon: form.icon,
        default_view: form.default_view,
        space_lead: form.space_lead || null,
        working_start_date: form.working_start_date || null,
        working_end_date: form.working_end_date || null,
      });
      if (res.status === "success") {
        setMessage({ type: "success", text: "Settings saved" });
      } else {
        setMessage({ type: "error", text: "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccess = async (newTeams, newMembers) => {
    try {
      const res = await api.put(`${baseUrl}/v1/space/access?id=${spaceId}`, {
        shared_teams: newTeams,
        shared_members: newMembers,
      });
      if (res.status === "success") {
        fetchAccess();
        setMessage({ type: "success", text: "Access updated" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update access" });
    }
  };

  const handleAddAccess = () => {
    if (!addId) return;
    const currentTeams = (accessData?.teams || []).map(t => ({ team_id: t._id, role: t.space_role || "contributor" }));
    const currentMembers = (accessData?.access_list || [])
      .filter(a => a.source === "individual" || a.source === "both")
      .map(a => ({ user_id: a.user._id, role: a.individual_role || a.role }));

    if (addType === "team") {
      handleSaveAccess([...currentTeams, { team_id: addId, role: addRole }], currentMembers);
    } else {
      handleSaveAccess(currentTeams, [...currentMembers, { user_id: addId, role: addRole }]);
    }
    setAddId("");
  };

  const handleRemoveTeam = (teamId) => {
    const currentTeams = (accessData?.teams || [])
      .map(t => ({ team_id: t._id, role: t.space_role || "contributor" }))
      .filter(t => t.team_id !== teamId);
    const currentMembers = (accessData?.access_list || [])
      .filter(a => a.source === "individual" || a.source === "both")
      .map(a => ({ user_id: a.user._id, role: a.individual_role || a.role }));
    handleSaveAccess(currentTeams, currentMembers);
  };

  const handleRemoveIndividual = (userId) => {
    const currentTeams = (accessData?.teams || []).map(t => ({ team_id: t._id, role: t.space_role || "contributor" }));
    const currentMembers = (accessData?.access_list || [])
      .filter(a => a.source === "individual" || a.source === "both")
      .map(a => ({ user_id: a.user._id, role: a.individual_role || a.role }))
      .filter(m => m.user_id !== userId);
    
    const entry = accessData?.access_list?.find(a => a.user._id === userId);
    if (entry?.source === "both") {
      // They still have team access, just removing individual override
      handleSaveAccess(currentTeams, currentMembers);
    } else {
      handleSaveAccess(currentTeams, currentMembers);
    }
  };

  const handleChangeRole = (userId, newRole) => {
    const currentTeams = (accessData?.teams || []).map(t => ({ team_id: t._id, role: t.space_role || "contributor" }));
    const currentMembers = (accessData?.access_list || [])
      .filter(a => a.source === "individual" || a.source === "both")
      .map(a => ({
        user_id: a.user._id,
        role: a.user._id === userId ? newRole : (a.individual_role || a.role),
      }));
    
    // If user was only via team, add as individual with this role
    const existing = currentMembers.find(m => m.user_id === userId);
    if (!existing) {
      currentMembers.push({ user_id: userId, role: newRole });
    }
    handleSaveAccess(currentTeams, currentMembers);
  };

  const getMemberName = (id) => {
    const m = members.find(m => m._id === id);
    return m?.name || m?.email || id;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Space Settings</SheetTitle>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
          </TabsList>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="space-name">Space Name</Label>
              <Input
                id="space-name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="space-color">Color</Label>
                <Input
                  id="space-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                  className="h-10 px-2"
                />
              </div>
              <div>
                <Label htmlFor="space-icon">Icon</Label>
                <Input
                  id="space-icon"
                  value={form.icon}
                  onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
                  placeholder="emoji or icon name"
                />
              </div>
            </div>

            <div>
              <Label>Default View</Label>
              <Select value={form.default_view} onValueChange={(v) => setForm(prev => ({ ...prev, default_view: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIEWS.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Space Lead</Label>
              <Select
                value={form.space_lead || "none"}
                onValueChange={(v) => setForm(prev => ({ ...prev, space_lead: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.space_lead && accessData?.space_lead?.warnings?.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  {accessData.space_lead.warnings[0]}
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Working Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.working_start_date}
                  onChange={(e) => setForm(prev => ({ ...prev, working_start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Working End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={form.working_end_date}
                  onChange={(e) => setForm(prev => ({ ...prev, working_end_date: e.target.value }))}
                />
              </div>
            </div>

            {message && (
              <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>
                {message.text}
              </p>
            )}

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </TabsContent>

          {/* ACCESS TAB */}
          <TabsContent value="access" className="space-y-4 mt-4">
            {/* Add access */}
            <div className="flex items-end gap-2">
              <div>
                <Label>Type</Label>
                <Select value={addType} onValueChange={setAddType}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>{addType === "team" ? "Team" : "Member"}</Label>
                <Select value={addId || "select"} onValueChange={(v) => setAddId(v === "select" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select" disabled>Select...</SelectItem>
                    {addType === "team" ? (
                      teams.map(t => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)
                    ) : (
                      members.map(m => <SelectItem key={m._id} value={m._id}>{m.name || m.email}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Role</Label>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPACE_ROLES.map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="icon" onClick={handleAddAccess} disabled={!addId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Teams with access */}
            {accessData?.teams?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Teams</h3>
                <div className="space-y-2">
                  {accessData.teams.map(team => (
                    <div key={team._id} className="flex items-center justify-between border rounded-md p-2">
                      <div>
                        <span className="font-medium text-sm">{team.name}</span>
                        <Badge variant="outline" className="ml-2 capitalize text-xs">{team.space_role}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleRemoveTeam(team._id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Access list */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Members with Access</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(accessData?.access_list || []).map((entry) => (
                      <TableRow key={entry.user._id}>
                        <TableCell className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={entry.user.avatar} />
                            <AvatarFallback className="text-xs">{entry.user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{entry.user.name || entry.user.email}</span>
                        </TableCell>
                        <TableCell>
                          {entry.source === "owner" ? (
                            <Badge variant="default" className="text-xs">Owner</Badge>
                          ) : (
                            <Select
                              value={entry.individual_role || entry.role}
                              onValueChange={(v) => handleChangeRole(entry.user._id, v)}
                            >
                              <SelectTrigger className="w-[110px] h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SPACE_ROLES.map(r => (
                                  <SelectItem key={r} value={r} className="capitalize text-xs">{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground capitalize">
                            {entry.source}
                            {entry.teams?.length > 0 && entry.source !== "owner" && (
                              <span className="block text-xs">{entry.teams.map(t => t.team_name).join(", ")}</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.source !== "owner" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleRemoveIndividual(entry.user._id)}
                              title={entry.source === "both" ? "Remove individual override" : "Remove from space"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!accessData?.access_list || accessData.access_list.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                          No members have access
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Role descriptions */}
            <div className="space-y-1">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <Shield className="h-3 w-3" /> Space Roles
              </h4>
              {SPACE_ROLES.map(role => (
                <p key={role} className="text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{role}</span> — {ROLE_DESCRIPTIONS[role]}
                </p>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Individual assignment always overrides team assignment.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
