import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";

const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumBacklogPlanning({
  data,
  viewState,
  onCellChange,
  patchSavedView,
  sprintFieldName = "sprint",
  moscowFieldName = "moscow",
}) {
  const [filterText, setFilterText] = useState("");
  const stories = useMemo(() => (data?.property_values || []).filter((t) => !t.parent_id), [data?.property_values]);
  const sprintCfg = viewState?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
  const backlogCfg = viewState?.scrum?.backlog || DEFAULT_SCRUM_VIEW_BLOCK.backlog;
  const activeSprint = sprintCfg.active_sprint || "";

  const backlogStories = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return stories.filter((s) => {
      const inBacklog = !String(s.sprint || "").trim();
      if (!inBacklog) return false;
      if (!q) return true;
      return String(s.title || "").toLowerCase().includes(q) || String(s.epic || "").toLowerCase().includes(q);
    });
  }, [filterText, stories]);

  const selectedIds = backlogCfg.selected_story_ids || [];
  const selectedSet = new Set(selectedIds);
  const selectedPoints = backlogStories
    .filter((s) => selectedSet.has(String(s.id)))
    .reduce((sum, s) => sum + asPoints(s.story_points), 0);

  const currentSprintCommitted = stories
    .filter((s) => String(s.sprint || "") === String(activeSprint || ""))
    .reduce((sum, s) => sum + asPoints(s.story_points), 0);

  const velocityWarningEnabled = backlogCfg.velocity_warning_enabled !== false;
  const allSprints = (sprintCfg.sprints || []).filter(Boolean);
  const historicalVelocityAvg = (() => {
    const previous = allSprints.filter((s) => s !== activeSprint);
    if (!previous.length) return 0;
    const totals = previous.map((s) =>
      stories
        .filter((x) => String(x.sprint || "") === String(s))
        .reduce((sum, x) => sum + asPoints(x.story_points), 0)
    );
    return Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10;
  })();
  const projected = currentSprintCommitted + selectedPoints;
  const warning = velocityWarningEnabled && historicalVelocityAvg > 0 && projected > historicalVelocityAvg;

  const patchBacklog = (updater) => {
    patchSavedView?.((prev) => {
      const current = prev?.scrum?.backlog || DEFAULT_SCRUM_VIEW_BLOCK.backlog;
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev.scrum || {}),
          backlog: next,
        },
      };
    });
  };

  const toggleSelected = (id) => {
    patchBacklog((current) => {
      const set = new Set(current.selected_story_ids || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...current, selected_story_ids: [...set] };
    });
  };

  const assignSelectedToActiveSprint = () => {
    if (!activeSprint) return;
    backlogStories
      .filter((s) => selectedSet.has(String(s.id)))
      .forEach((s) => onCellChange?.(s, sprintFieldName, activeSprint));
    patchBacklog((current) => ({ ...current, selected_story_ids: [] }));
  };

  const toggleVelocityWarning = () => {
    patchBacklog((current) => ({ ...current, velocity_warning_enabled: !(current.velocity_warning_enabled !== false) }));
  };

  return (
    <section className="mb-4 space-y-3 rounded-lg border bg-card p-3 text-left">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[260px] flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Backlog filter</p>
          <div className="relative">
            <ListFilter className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter backlog stories"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={assignSelectedToActiveSprint}
          disabled={!activeSprint || selectedIds.length === 0}
        >
          Add selected to active sprint
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={toggleVelocityWarning}>
          Velocity warning: {velocityWarningEnabled ? "On" : "Off"}
        </Button>
      </div>

      {warning && (
        <div className="flex items-center gap-2 rounded border border-amber-400/60 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          Projected sprint points ({projected}) exceed historical velocity ({historicalVelocityAvg}).
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Active sprint: <span className="font-medium text-foreground">{activeSprint || "None"}</span> ·
        Selected backlog points: <span className="font-medium text-foreground"> {selectedPoints}</span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {backlogStories.slice(0, 18).map((s) => {
          const checked = selectedSet.has(String(s.id));
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSelected(String(s.id))}
              className={`rounded border p-2 text-left ${checked ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="line-clamp-1 text-xs font-semibold">{s.title || "Untitled story"}</p>
                <input type="checkbox" readOnly checked={checked} />
              </div>
              <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                <Badge variant="outline">{asPoints(s.story_points)} pts</Badge>
                {s.epic && <Badge variant="secondary">{s.epic}</Badge>}
                {s[moscowFieldName] && <Badge variant="outline">MoSCoW: {s[moscowFieldName]}</Badge>}
              </div>
            </button>
          );
        })}
        {backlogStories.length === 0 && (
          <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
            No backlog stories without sprint assignment.
          </div>
        )}
      </div>
    </section>
  );
}

