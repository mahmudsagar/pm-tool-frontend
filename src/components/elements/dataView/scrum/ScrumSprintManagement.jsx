import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";

const DONE_KEYS = ["done", "completed", "complete", "closed"];
const norm = (v) => String(v || "").trim().toLowerCase();
const isDone = (s) => DONE_KEYS.some((k) => norm(s).includes(k));
const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumSprintManagement({ data, viewState, patchSavedView }) {
  const [newSprintName, setNewSprintName] = useState("");
  const stories = useMemo(
    () => (data?.property_values || []).filter((t) => !t.parent_id),
    [data?.property_values]
  );

  const sprintCfg = viewState?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
  const activeSprint = sprintCfg.active_sprint || "";

  const sprintOptions = useMemo(() => {
    const set = new Set((sprintCfg.sprints || []).filter(Boolean));
    stories.forEach((s) => {
      if (s.sprint) set.add(String(s.sprint));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [sprintCfg.sprints, stories]);

  const bySprint = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const sprint = String(s.sprint || "Unscheduled");
      const prev = map.get(sprint) || { committed: 0, completed: 0, stories: 0 };
      const points = asPoints(s.story_points);
      prev.committed += points;
      prev.completed += isDone(s.status) ? points : 0;
      prev.stories += 1;
      map.set(sprint, prev);
    });
    return map;
  }, [stories]);

  const activeStats = bySprint.get(activeSprint) || { committed: 0, completed: 0, stories: 0 };
  const previousSprints = sprintOptions.filter((s) => s !== activeSprint);
  const historicalVelocityAvg =
    previousSprints.length === 0
      ? 0
      : Math.round(
          (previousSprints.reduce((sum, sprint) => sum + (bySprint.get(sprint)?.completed || 0), 0) /
            previousSprints.length) *
            10
        ) / 10;
  const velocityExceeded = historicalVelocityAvg > 0 && activeStats.committed > historicalVelocityAvg;

  const byAssignee = useMemo(() => {
    const map = new Map();
    stories
      .filter((s) => String(s.sprint || "") === String(activeSprint || ""))
      .forEach((s) => {
        const key = String(s.assignee || "unassigned");
        const prev = map.get(key) || 0;
        map.set(key, prev + asPoints(s.story_points));
      });
    return [...map.entries()].map(([assignee, points]) => ({ assignee, points }));
  }, [activeSprint, stories]);

  const addSprint = () => {
    const name = newSprintName.trim();
    if (!name) return;
    patchSavedView?.((prev) => {
      const current = prev?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
      const nextSprints = Array.from(new Set([...(current.sprints || []), name]));
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev.scrum || {}),
          sprint_management: {
            ...current,
            sprints: nextSprints,
            active_sprint: current.active_sprint || name,
          },
        },
      };
    });
    setNewSprintName("");
  };

  const setActive = (value) => {
    patchSavedView?.((prev) => {
      const current = prev?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev.scrum || {}),
          sprint_management: { ...current, active_sprint: value },
        },
      };
    });
  };

  const setCapacity = (assignee, raw) => {
    const n = Number(raw);
    patchSavedView?.((prev) => {
      const current = prev?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
      return {
        ...prev,
        scrum: {
          ...DEFAULT_SCRUM_VIEW_BLOCK,
          ...(prev.scrum || {}),
          sprint_management: {
            ...current,
            member_capacity: {
              ...(current.member_capacity || {}),
              [assignee]: raw === "" || Number.isNaN(n) ? "" : n,
            },
          },
        },
      };
    });
  };

  return (
    <div className="mb-4 rounded-lg border bg-card p-3 text-left">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <p className="mb-1 text-xs text-muted-foreground">Active sprint</p>
          <Select value={activeSprint || "__none__"} onValueChange={(v) => setActive(v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No active sprint</SelectItem>
              {sprintOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[260px]">
          <p className="mb-1 text-xs text-muted-foreground">Create sprint</p>
          <div className="flex gap-2">
            <Input
              value={newSprintName}
              onChange={(e) => setNewSprintName(e.target.value)}
              placeholder="Sprint 14"
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" onClick={addSprint}>
              Add
            </Button>
          </div>
        </div>
        <div className="ml-auto grid gap-1 text-xs">
          <p>Committed: <span className="font-semibold">{activeStats.committed}</span> pts</p>
          <p>Completed: <span className="font-semibold">{activeStats.completed}</span> pts</p>
          <p>Stories: <span className="font-semibold">{activeStats.stories}</span></p>
          <p>Historical velocity: <span className="font-semibold">{historicalVelocityAvg}</span> pts</p>
        </div>
      </div>

      {velocityExceeded && (
        <div className="mt-3 flex items-center gap-2 rounded border border-amber-400/60 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          Committed points exceed historical velocity.
        </div>
      )}

      {!!activeSprint && byAssignee.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {byAssignee.map(({ assignee, points }) => {
            const cap = sprintCfg.member_capacity?.[assignee];
            const capacity = cap === "" || cap == null ? null : Number(cap);
            const over = capacity != null && Number.isFinite(capacity) && points > capacity;
            return (
              <div key={assignee} className="rounded border p-2">
                <p className="truncate text-xs font-medium">{assignee === "unassigned" ? "Unassigned" : assignee}</p>
                <p className="text-xs text-muted-foreground">Committed: {points} pts</p>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    className="h-7 w-20 text-xs"
                    value={cap ?? ""}
                    onChange={(e) => setCapacity(assignee, e.target.value)}
                    placeholder="Cap"
                  />
                  {over && <span className="text-[10px] font-semibold text-amber-600">Over capacity</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

