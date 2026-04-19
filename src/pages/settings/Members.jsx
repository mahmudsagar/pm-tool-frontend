import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Trash2, Search } from "lucide-react";
import useAuthStore from "@/stores/useAuthStore";
import { api } from "@/utils/api";
import { baseUrl } from "@/utils/constants";

const ROLE_COLORS = {
  owner: "default",
  admin: "destructive",
  member: "secondary",
  guest: "outline",
};

export default function MembersSettings() {
  const { currentWorkspace, user } = useAuthStore();
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace?._id) return;
    setLoading(true);
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "";
      const res = await api.get(`${baseUrl}/v1/workspace/member?workspace_id=${currentWorkspace._id}${searchParam}`);
      if (res.status === "success" && res.data) {
        setOwner(res.data.owner);
        setMembers(res.data.members || []);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load members" });
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?._id, searchTerm]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    try {
      const res = await api.post(`${baseUrl}/v1/workspace/member`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (res.status === "success") {
        setInviteEmail("");
        setMessage({ type: "success", text: "Member invited successfully" });
        fetchMembers();
      } else {
        const errMsg = res?.message?.[0]?.error?.[0] || "Failed to invite member";
        setMessage({ type: "error", text: errMsg });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to invite member" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member? They will lose access to all workspace resources.")) return;
    try {
      const res = await api.delete(`${baseUrl}/v1/workspace/member?user_id=${memberId}`);
      if (res.status === "success") {
        setMessage({ type: "success", text: "Member removed" });
        if (res.data?.affected_teams?.length > 0) {
          const teamNames = res.data.affected_teams.map(t => t.team_name).join(", ");
          setMessage({ type: "success", text: `Member removed. Team lead cleared from: ${teamNames}` });
        }
        fetchMembers();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to remove member" });
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const res = await api.put(`${baseUrl}/v1/workspace/member`, {
        user_id: memberId,
        role: newRole,
      });
      if (res.status === "success") {
        fetchMembers();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update role" });
    }
  };

  const isAdmin = currentWorkspace?.owner_id === user?._id ||
    members.some(m => m._id === user?._id && m.workspace_role === "admin");

  return (
    <div>
      <h1 className="text-2xl font-bold">Members</h1>
      <p className="text-muted-foreground mt-1">
        Invite, remove, and manage everyone in the workspace
      </p>

      <Separator className="my-6" />

      {/* Invite form */}
      {isAdmin && (
        <form onSubmit={handleInvite} className="flex items-end gap-3 mb-6">
          <div className="flex-1">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={inviting} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {inviting ? "Inviting..." : "Invite"}
          </Button>
        </form>
      )}

      {message && (
        <p className={`text-sm mb-4 ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search members..."
          className="pl-9"
        />
      </div>

      {/* Members table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Owner row */}
                {owner && (
                  <TableRow>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={owner.avatar} />
                        <AvatarFallback>{owner.name?.charAt(0)?.toUpperCase() || "O"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{owner.name}</span>
                    </TableCell>
                    <TableCell>{owner.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS.owner}>Owner</Badge>
                    </TableCell>
                    {isAdmin && <TableCell />}
                  </TableRow>
                )}
                {/* Member rows */}
                {members.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name?.charAt(0)?.toUpperCase() || "M"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {isAdmin && member._id !== user?._id ? (
                        <Select
                          value={member.workspace_role || "member"}
                          onValueChange={(v) => handleRoleChange(member._id, v)}
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={ROLE_COLORS[member.workspace_role] || "secondary"} className="capitalize">
                          {member.workspace_role || "member"}
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {member._id !== user?._id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(member._id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!owner && members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                      No members found
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <p><strong>Admin</strong> — Full workspace access, manage members and settings</p>
        <p><strong>Member</strong> — Standard access to workspace resources</p>
        <p><strong>Guest</strong> — Limited access, cannot be given Manager role on spaces</p>
      </div>
    </div>
  );
}
