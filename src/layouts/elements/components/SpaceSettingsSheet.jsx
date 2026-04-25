import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, X } from "lucide-react";
import { api } from "@/utils/api";
import { baseUrl, mediaEndpoint } from "@/utils/constants";
import { normalizeEntityAccess } from "@/utils/entityAccessUtils";

const VIEWS = [
  { value: "table", label: "Table" },
  { value: "timeline", label: "Timeline" },
  { value: "calendar", label: "Calendar" },
  { value: "kanban", label: "Kanban" },
];

export default function SpaceSettingsSheet({ spaceId, space, open, onOpenChange }) {
  const [form, setForm] = useState({
    name: "",
    icon: "",
    default_view: "table",
    space_lead: "",
    working_start_date: "",
    working_end_date: "",
  });
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [iconUploading, setIconUploading] = useState(false);

  // Load space data and members together so form fields are ready in one render.
  useEffect(() => {
    if (!open || !spaceId) return;
    let cancelled = false;

    const init = async () => {
      const [spaceRes, membersRes] = await Promise.allSettled([
        api.get(`${baseUrl}/v1/space?id=${spaceId}`),
        api.get(`${baseUrl}/v1/workspace/member`),
      ]);

      if (cancelled) return;

      if (membersRes.status === "fulfilled" && membersRes.value?.status === "success" && membersRes.value.data) {
        const all = [];
        if (membersRes.value.data.owner) all.push(membersRes.value.data.owner);
        if (membersRes.value.data.members) all.push(...membersRes.value.data.members);
        setMembers(all);
      }
      if (spaceRes.status === "fulfilled" && spaceRes.value?.status === "success" && spaceRes.value.data?.[0]) {
        const s = normalizeEntityAccess(spaceRes.value.data[0]);
        setForm({
          name: s.name || "",
          icon: s.icon || "",
          default_view: s.default_view || "table",
          space_lead: s.space_lead || "",
          working_start_date: s.working_start_date ? s.working_start_date.split("T")[0] : "",
          working_end_date: s.working_end_date ? s.working_end_date.split("T")[0] : "",
        });
      }
    };

    init();

    return () => { cancelled = true; };
  }, [open, spaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`${baseUrl}/v1/space`, {
        id: spaceId,
        name: form.name,
        icon: form.icon,
        default_view: form.default_view,
        space_lead: form.space_lead || null,
        working_start_date: form.working_start_date || null,
        working_end_date: form.working_end_date || null,
      });
      if (res.status === "success") {
        // Re-fetch from DB to confirm the saved state is what gets displayed
        const refreshed = await api.get(`${baseUrl}/v1/space?id=${spaceId}`).catch(() => null);
        if (refreshed?.status === "success" && refreshed.data?.[0]) {
          const s = refreshed.data[0];
          setForm({
            name: s.name || "",
            icon: s.icon || "",
            default_view: s.default_view || "table",
            space_lead: s.space_lead || "",
            working_start_date: s.working_start_date ? s.working_start_date.split("T")[0] : "",
            working_end_date: s.working_end_date ? s.working_end_date.split("T")[0] : "",
          });
        }
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Space Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="space-name">Space Name</Label>
              <Input
                id="space-name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Icon</Label>
              <div className="flex items-center gap-3 mt-1">
                  {form.icon ? (
                    <div className="relative w-12 h-12 rounded border overflow-hidden shrink-0">
                      <img src={form.icon} alt="icon" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-black/60 rounded-bl p-0.5 text-white"
                        onClick={() => setForm(prev => ({ ...prev, icon: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded border flex items-center justify-center bg-muted shrink-0">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      disabled={iconUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIconUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('media_type', 'icon');
                          fd.append('reference_id', spaceId);
                          fd.append('reference_for', 'space');
                          fd.append('caption', ' ');
                          const result = await api.upload(`${baseUrl}${mediaEndpoint}`, fd);
                          if (result?.data?.url) {
                            setForm(prev => ({ ...prev, icon: result.data.url }));
                          }
                        } catch {
                          setMessage({ type: "error", text: "Icon upload failed" });
                        } finally {
                          setIconUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={iconUploading} asChild>
                      <span>{iconUploading ? "Uploading..." : form.icon ? "Replace" : "Upload image"}</span>
                    </Button>
                  </label>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
