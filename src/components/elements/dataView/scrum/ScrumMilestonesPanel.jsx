import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";

export default function ScrumMilestonesPanel({
  data,
  viewState,
  patchSavedView,
  activeSprint = "",
  compact = false,
}) {
  const scrumCfg = viewState?.scrum || DEFAULT_SCRUM_VIEW_BLOCK;
  const releaseMilestones = scrumCfg.release_plan?.milestones || [];
  const stories = useMemo(
    () => (data?.property_values || []).filter((t) => !t.parent_id),
    [data?.property_values]
  );

  const allSprints = useMemo(() => {
    const set = new Set((scrumCfg.sprint_management?.sprints || []).filter(Boolean));
    stories.forEach((s) => { if (s.sprint) set.add(String(s.sprint)); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scrumCfg.sprint_management?.sprints, stories]);

  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneSprint, setMilestoneSprint] = useState(activeSprint || "");

  const patchScrum = (updater) => {
    patchSavedView?.((prev) => {
      const nextScrum = typeof updater === "function" ? updater(prev?.scrum || DEFAULT_SCRUM_VIEW_BLOCK) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev.scrum || {}),
          ...nextScrum,
        },
      };
    });
  };

  const addMilestone = () => {
    const name = milestoneName.trim();
    if (!name) return;
    patchScrum((current) => ({
      ...current,
      release_plan: {
        ...(current.release_plan || {}),
        milestones: [
          ...(current.release_plan?.milestones || []),
          {
            id: String(Date.now()),
            name,
            sprint: milestoneSprint === "__none__" ? "" : milestoneSprint,
          },
        ],
      },
    }));
    setMilestoneName("");
    setMilestoneSprint(activeSprint || "");
  };

  const removeMilestone = (id, index) => {
    patchScrum((current) => ({
      ...current,
      release_plan: {
        ...(current.release_plan || {}),
        milestones: (current.release_plan?.milestones || []).filter((m, idx) => {
          if (id) return m.id !== id;
          return idx !== index;
        }),
      },
    }));
  };

  return (
    <div className={compact ? "space-y-3 text-left" : "rounded-lg border bg-card p-4 space-y-3 text-left"}>
      {!compact && (
        <>
          <h3 className="text-sm font-semibold">Release roadmap (milestones)</h3>
          <p className="text-xs text-muted-foreground">
            Plan release targets and tie them to sprints on this board.
          </p>
        </>
      )}
      <div className="space-y-2 text-xs">
        {releaseMilestones.length === 0 && (
          <p className="text-muted-foreground">No milestones yet. Add one below.</p>
        )}
        {releaseMilestones.map((m, idx) => (
          <div
            key={m.id || `${m.name}-${idx}`}
            className="flex items-center gap-2 rounded-xl border bg-muted/20 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm">{m.name || "Untitled milestone"}</p>
              <p className="text-muted-foreground">tied to {m.sprint || "no sprint"}</p>
            </div>
            {!compact && <Badge variant="outline" className="shrink-0">{m.sprint || "Backlog"}</Badge>}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeMilestone(m.id, idx)}
              aria-label={`Remove ${m.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          value={milestoneName}
          onChange={(e) => setMilestoneName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addMilestone();
            }
          }}
          placeholder="Beta launch"
          className="h-8 flex-1 text-xs"
        />
        <Select value={milestoneSprint || "__none__"} onValueChange={setMilestoneSprint}>
          <SelectTrigger className="h-8 w-full text-xs sm:w-36">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No sprint</SelectItem>
            {allSprints.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 text-xs gap-1"
          onClick={addMilestone}
          disabled={!milestoneName.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
