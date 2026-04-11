import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, Plus, Loader2 } from "lucide-react";
import useAuthStore from "@/stores/useAuthStore";

const API_BASE = import.meta.env.BN_BASE_URL + "/v1";

async function apiFetch(url, method, body, token) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  try {
    const workspaceRaw = localStorage.getItem('currentWorkspace');
    const workspaceId = workspaceRaw ? JSON.parse(workspaceRaw)?._id : null;
    if (workspaceId) opts.headers['X-Workspace-ID'] = workspaceId;
  } catch (_) { /* ignore */ }
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}

export default function WorkspaceManagerContent() {
  const { workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace, token } = useAuthStore();

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const startEdit = (ws) => {
    setEditingId(ws._id);
    setEditName(ws.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (id) => {
    if (!editName.trim()) return;
    setLoadingId(id);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/workspace?id=${id}`, "PUT", { name: editName.trim() }, token);
      const updated = workspaces.map((w) =>
        w._id === id ? { ...w, name: editName.trim(), ...(res?.data || {}) } : w
      );
      setWorkspaces(updated);
      if (currentWorkspace?._id === id) {
        setCurrentWorkspace({ ...currentWorkspace, name: editName.trim() });
      }
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const deleteWorkspace = async (id) => {
    if (workspaces.length <= 1) return;
    setLoadingId(id);
    setError(null);
    try {
      await apiFetch(`${API_BASE}/workspace?id=${id}`, "DELETE", null, token);
      const updated = workspaces.filter((w) => w._id !== id);
      setWorkspaces(updated);
      if (currentWorkspace?._id === id) {
        setCurrentWorkspace(updated[0]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const createWorkspace = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/workspace`, "POST", { name: newName.trim() }, token);
      const created = res?.data || { _id: Date.now().toString(), name: newName.trim() };
      setWorkspaces([...workspaces, created]);
      setNewName("");
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-80 flex flex-col gap-3">
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <ul className="flex flex-col gap-1">
          {(workspaces || []).map((ws) => (
            <li key={ws._id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              {editingId === ws._id ? (
                <>
                  <Input
                    className="h-7 text-xs flex-1"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(ws._id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => saveEdit(ws._id)}
                    disabled={loadingId === ws._id}
                  >
                    {loadingId === ws._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={cancelEdit}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm truncate">{ws.name}</span>
                  {currentWorkspace?._id === ws._id && (
                    <span className="text-xs text-muted-foreground shrink-0">current</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => startEdit(ws)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => deleteWorkspace(ws._id)}
                    disabled={workspaces.length <= 1 || loadingId === ws._id}
                    title={workspaces.length <= 1 ? "Cannot delete the only workspace" : "Delete workspace"}
                  >
                    {loadingId === ws._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>

      <div className="flex items-center gap-2 pt-1 border-t">
        <Input
          className="h-8 text-xs flex-1"
          placeholder="New workspace name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
        />
        <Button
          size="sm"
          className="h-8 shrink-0"
          onClick={createWorkspace}
          disabled={creating || !newName.trim()}
        >
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}
