import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Flag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";

const DONE_KEYS = ["done", "completed", "complete", "closed"];
const norm = (v) => String(v || "").trim().toLowerCase();
const isDone = (s) => DONE_KEYS.some((k) => norm(s).includes(k));
const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumSprintHub({
  data,
  viewState,
  patchSavedView,
  onSprintSelected,
  onSprintClosed,
}) {
  const { toast } = useToast();
  const [newSprintName, setNewSprintName] = useState("");
  const [optimisticSprints, setOptimisticSprints] = useState([]);
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

  const persistedSprintsKey = (sprintCfg.sprints || []).join("\0");
  useEffect(() => {
    setOptimisticSprints([]);
  }, [persistedSprintsKey]);

  const sprintList = useMemo(() => {
    const names = new Set([
      ...(sprintCfg.sprints || []),
      ...optimisticSprints,
    ].filter(Boolean));
    stories.forEach((s) => {
      if (s.sprint) names.add(String(s.sprint));
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [sprintCfg.sprints, optimisticSprints, stories]);

  const historicalVelocityAvg = useMemo(() => {
    const previous = sprintList.filter((s) => s !== activeSprint);
    if (!previous.length) return 0;
    const total = previous.reduce((sum, sprint) => sum + (sprintStats.get(sprint)?.completed || 0), 0);
    return Math.round((total / previous.length) * 10) / 10;
  }, [activeSprint, sprintList, sprintStats]);

  const activeStats = sprintStats.get(activeSprint) || { committed: 0, completed: 0, stories: 0 };
  const velocityExceeded = historicalVelocityAvg > 0 && activeStats.committed > historicalVelocityAvg;

  const persistSprintCfg = (updater) => {
    if (!patchSavedView) {
      toast({
        title: "Cannot save sprint",
        description: "Board settings are not available yet.",
        variant: "destructive",
      });
      return false;
    }
    patchSavedView((prev) => {
      const current = prev?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
      const nextMgmt = typeof updater === "function" ? updater(current) : updater;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev?.scrum || {}),
          sprint_management: nextMgmt,
        },
      };
    });
    return true;
  };

  const addSprint = () => {
    const name = newSprintName.trim();
    if (!name) {
      toast({
        title: "Sprint name required",
        description: "Enter a name before adding a sprint.",
        variant: "destructive",
      });
      return;
    }
    setOptimisticSprints((prev) => (prev.includes(name) ? prev : [...prev, name]));
    if (!persistSprintCfg((current) => ({
      ...current,
      sprints: Array.from(new Set([...(current.sprints || []), name])),
      active_sprint: current.active_sprint || name,
    }))) {
      return;
    }
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
    onSprintClosed?.();
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSprint();
                }
              }}
              placeholder="Sprint 21"
            />
            <Button type="button" className="h-8" size="sm" onClick={addSprint}>
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

      <div className="flex flex-col gap-2">
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
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => setActiveSprint(sprint)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveSprint(sprint);
                }
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{sprint}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Flag className="h-3 w-3 shrink-0" />
                    {st.stories} stories
                  </span>
                  <span>Committed: {st.committed} pts</span>
                  <span>Completed: {st.completed} pts</span>
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Open</Badge>}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => removeSprint(sprint)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* {activeSprint && (
        <div className="flex items-center justify-between rounded border bg-muted/20 px-3 py-2 text-xs">
          <p className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Viewing sprint <span className="font-semibold">{activeSprint}</span> task list
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={closeActiveSprint}
          >
            Close sprint view
          </Button>
        </div>
      )} */}
    </section>
  );
}

