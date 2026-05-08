import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";

const DONE_KEYS = ["done", "completed", "complete", "closed"];
const norm = (v) => String(v || "").trim().toLowerCase();
const isDone = (s) => DONE_KEYS.some((k) => norm(s).includes(k));
const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumSprintHub({ data, viewState, patchSavedView, onSprintSelected }) {
  const [newSprintName, setNewSprintName] = useState("");
  const stories = useMemo(() => (data?.property_values || []).filter((t) => !t.parent_id), [data?.property_values]);

  const sprintCfg = viewState?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
  const activeSprint = sprintCfg.active_sprint || "";

  const sprintStats = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const sprint = String(s.sprint || "Backlog");
      const prev = map.get(sprint) || { sprint, committed: 0, completed: 0, stories: 0 };
      const pts = asPoints(s.story_points);
      prev.committed += pts;
      prev.completed += isDone(s.status) ? pts : 0;
      prev.stories += 1;
      map.set(sprint, prev);
    });
    return map;
  }, [stories]);

  const sprintList = useMemo(() => {
    const names = new Set((sprintCfg.sprints || []).filter(Boolean));
    stories.forEach((s) => {
      if (s.sprint) names.add(String(s.sprint));
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [sprintCfg.sprints, stories]);

  const historicalVelocityAvg = useMemo(() => {
    const previous = sprintList.filter((s) => s !== activeSprint);
    if (!previous.length) return 0;
    const total = previous.reduce((sum, sprint) => sum + (sprintStats.get(sprint)?.completed || 0), 0);
    return Math.round((total / previous.length) * 10) / 10;
  }, [activeSprint, sprintList, sprintStats]);

  const activeStats = sprintStats.get(activeSprint) || { committed: 0, completed: 0, stories: 0 };
  const velocityExceeded = historicalVelocityAvg > 0 && activeStats.committed > historicalVelocityAvg;

  const persistSprintCfg = (updater) => {
    patchSavedView?.((prev) => {
      const current = prev?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev.scrum || {}),
          sprint_management: next,
        },
      };
    });
  };

  const addSprint = () => {
    const name = newSprintName.trim();
    if (!name) return;
    persistSprintCfg((current) => ({
      ...current,
      sprints: Array.from(new Set([...(current.sprints || []), name])),
      active_sprint: current.active_sprint || name,
    }));
    setNewSprintName("");
  };

  const setActiveSprint = (name) => {
    persistSprintCfg((current) => ({ ...current, active_sprint: name }));
    onSprintSelected?.(name);
  };

  const removeSprint = (name) => {
    persistSprintCfg((current) => {
      const nextSprints = (current.sprints || []).filter((s) => s !== name);
      const nextActive = current.active_sprint === name ? (nextSprints[0] || "") : current.active_sprint;
      return {
        ...current,
        sprints: nextSprints,
        active_sprint: nextActive,
      };
    });
  };

  const closeActiveSprint = () => {
    if (!activeSprint) return;
    const next = sprintList.find((s) => s !== activeSprint) || "";
    persistSprintCfg((current) => ({ ...current, active_sprint: next }));
  };

  return (
    <section className="mb-4 space-y-3 rounded-lg border bg-card p-3 text-left">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[260px] flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Create sprint</p>
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs"
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              placeholder="Sprint 21"
            />
            <Button className="h-8" size="sm" onClick={addSprint}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Sprint
            </Button>
          </div>
        </div>
        <div className="grid gap-1 text-xs">
          <p>Active committed: <span className="font-semibold">{activeStats.committed}</span> pts</p>
          <p>Historical velocity: <span className="font-semibold">{historicalVelocityAvg}</span> pts</p>
        </div>
      </div>

      {velocityExceeded && (
        <div className="flex items-center gap-2 rounded border border-amber-400/60 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          Committed points exceed historical velocity for active sprint.
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {sprintList.length === 0 && (
          <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
            No sprints yet. Create one to start planning.
          </div>
        )}
        {sprintList.map((sprint) => {
          const st = sprintStats.get(sprint) || { committed: 0, completed: 0, stories: 0 };
          const active = sprint === activeSprint;
          return (
            <div
              key={sprint}
              className={`rounded border p-3 text-left transition ${active ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => setActiveSprint(sprint)} className="truncate text-left text-sm font-semibold hover:underline">
                  {sprint}
                </button>
                <div className="flex items-center gap-1">
                  {active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Open</Badge>}
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => removeSprint(sprint)}>
                    Remove
                  </Button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1"><Flag className="h-3 w-3" /> {st.stories} stories</p>
                <p>Committed: {st.committed} pts</p>
                <p>Completed: {st.completed} pts</p>
              </div>
            </div>
          );
        })}
      </div>

      {activeSprint && (
        <div className="flex items-center justify-between rounded border bg-muted/20 px-3 py-2 text-xs">
          <p className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Viewing sprint <span className="font-semibold">{activeSprint}</span> task list
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={closeActiveSprint}>
            Close sprint view
          </Button>
        </div>
      )}
    </section>
  );
}

