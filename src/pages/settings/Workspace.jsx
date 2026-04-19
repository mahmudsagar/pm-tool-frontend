import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import useAuthStore from "@/stores/useAuthStore";
import { api } from "@/utils/api";
import { baseUrl } from "@/utils/constants";

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland',
];

export default function WorkspaceSettings() {
  const { currentWorkspace, setCurrentWorkspace } = useAuthStore();
  const [form, setForm] = useState({
    name: "",
    logo: "",
    timezone: "UTC",
    date_format: "MM/DD/YYYY",
    first_day_of_week: "monday",
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    billing_plan: "free",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (currentWorkspace) {
      setForm({
        name: currentWorkspace.name || "",
        logo: currentWorkspace.logo || "",
        timezone: currentWorkspace.timezone || "UTC",
        date_format: currentWorkspace.date_format || "MM/DD/YYYY",
        first_day_of_week: currentWorkspace.first_day_of_week || "monday",
        working_days: currentWorkspace.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        billing_plan: currentWorkspace.billing_plan || "free",
      });
    }
  }, [currentWorkspace]);

  const toggleWorkingDay = (day) => {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentWorkspace?._id) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`${baseUrl}/v1/workspace`, {
        _id: currentWorkspace._id,
        ...form,
      });
      if (res.status === "success" && res.data) {
        setCurrentWorkspace({ ...currentWorkspace, ...res.data });
        setMessage({ type: "success", text: "Workspace updated successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to update workspace" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update workspace" });
    } finally {
      setSaving(false);
    }
  };

  if (!currentWorkspace) {
    return <p className="text-muted-foreground">No workspace selected</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Workspace</h1>
      <p className="text-muted-foreground mt-1">Manage your workspace settings</p>

      <Separator className="my-6" />

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="ws-logo">Logo URL</Label>
            <Input
              id="ws-logo"
              value={form.logo}
              onChange={(e) => setForm(prev => ({ ...prev, logo: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm(prev => ({ ...prev, timezone: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date Format</Label>
            <Select value={form.date_format} onValueChange={(v) => setForm(prev => ({ ...prev, date_format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(df => (
                  <SelectItem key={df} value={df}>{df}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>First Day of Week</Label>
          <Select value={form.first_day_of_week} onValueChange={(v) => setForm(prev => ({ ...prev, first_day_of_week: v }))}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map(day => (
                <SelectItem key={day} value={day} className="capitalize">{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-3 block">Working Days (for deadline calculations)</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map(day => (
              <label key={day} className="flex items-center gap-2 capitalize cursor-pointer">
                <Checkbox
                  checked={form.working_days.includes(day)}
                  onCheckedChange={() => toggleWorkingDay(day)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-2 block">Billing &amp; Plan</Label>
          <Badge variant="outline" className="text-sm capitalize">
            {form.billing_plan}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            Contact support to change your billing plan.
          </p>
        </div>

        {message && (
          <p className={message.type === "success" ? "text-sm text-green-600" : "text-sm text-destructive"}>
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
