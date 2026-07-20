import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "@/BetterRouter/Link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";
import {
  buildAssigneeLabelMap,
  buildTaskRefLookup,
  formatAssigneeLabel,
  formatTaskLabel,
} from "@/components/elements/dataView/scrum/taskDisplayUtils";
import TestCoveragePanel from "@/components/elements/dataView/scrum/TestCoveragePanel";
import { useTestCoverage } from "@/hooks/queries/useTestCoverageQuery";
import SprintRetroButton from "@/components/elements/dataView/scrum/SprintRetroButton";
import { normalizeSprintKey } from "@/components/elements/dataView/scrum/retroUtils";
import { api } from "@/utils/api";
import { baseUrl } from "@/utils/constants";
import { useToast } from "@/components/ui/use-toast";

const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumAgileModulesSection({
  data,
  viewState,
  patchSavedView,
  assigneeOptions = [],
  boardId,
  activeSprint,
}) {
  const stories = useMemo(() => (data?.property_values || []).filter((t) => !t.parent_id), [data?.property_values]);
  const scrumCfg = viewState?.scrum || DEFAULT_SCRUM_VIEW_BLOCK;
  const standups = scrumCfg.standups || [];
  const releaseMilestones = scrumCfg.release_plan?.milestones || [];
  const retroBoards = scrumCfg.retro_boards || {};
  const teamHealth = scrumCfg.team_health || DEFAULT_SCRUM_VIEW_BLOCK.team_health;
  const { data: coverageData, isLoading: coverageLoading } = useTestCoverage(boardId, {
    enabled: Boolean(boardId),
  });
  const coverageBySprint = coverageData?.by_sprint || {};
  const coverageRegressions = coverageData?.regressions || [];

  // All sprints from the registry (to list retro boards per sprint)
  const allSprints = useMemo(() => {
    const set = new Set((scrumCfg.sprint_management?.sprints || []).filter(Boolean));
    stories.forEach((s) => { if (s.sprint) set.add(String(s.sprint)); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scrumCfg.sprint_management?.sprints, stories]);

  const [standupText, setStandupText] = useState("");
  const [blockerText, setBlockerText] = useState("");
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneSprint, setMilestoneSprint] = useState(activeSprint || "");

  const assigneeMap = useMemo(() => buildAssigneeLabelMap(assigneeOptions), [assigneeOptions]);
  const taskLookup = useMemo(
    () => buildTaskRefLookup(data?.property_values || []),
    [data?.property_values]
  );

  const dependencies = useMemo(() => {
    const edges = [];
    stories.forEach((s) => {
      const dep = s.depends_on || s.blocked_by || "";
      if (!dep) return;
      edges.push({
        source: formatTaskLabel(s),
        target: taskLookup.labelForRef(dep),
        critical: asPoints(s.story_points) >= 8,
      });
    });
    return edges.slice(0, 12);
  }, [stories, taskLookup]);

  const workload = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const key = String(s.assignee || "");
      const prev = map.get(key) || 0;
      map.set(key, prev + asPoints(s.story_points));
    });
    return [...map.entries()]
      .map(([assigneeId, points]) => ({
        assigneeId,
        assignee: formatAssigneeLabel(assigneeId, assigneeMap),
        points,
      }))
      .sort((a, b) => b.points - a.points);
  }, [stories, assigneeMap]);

  const burnoutSignal = useMemo(() => {
    const heavy = workload.filter((w) => w.points >= 20).length;
    if (heavy >= 2) return "High";
    if (heavy === 1) return "Medium";
    return "Low";
  }, [workload]);

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

  const addStandup = () => {
    const update = standupText.trim();
    if (!update && !blockerText.trim()) return;
    patchScrum((current) => ({
      ...current,
      standups: [
        ...(current.standups || []),
        {
          id: String(Date.now()),
          at: new Date().toISOString(),
          update,
          blocker: blockerText.trim(),
          notify_scrum_master: Boolean(blockerText.trim()),
        },
      ],
    }));
    setStandupText("");
    setBlockerText("");
  };

  return (
    <section className="space-y-4 text-left">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Dependency map (blocked-by / blocks)</h3>
          <div className="mt-3 space-y-2 text-xs">
            {dependencies.length === 0 && <p className="text-muted-foreground">No dependency links yet.</p>}
            {dependencies.map((edge, idx) => (
              <div key={`${edge.source}-${idx}`} className="flex items-center justify-between rounded border p-2">
                <span className="truncate">{edge.source}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="truncate">{edge.target}</span>
                {edge.critical && <Badge variant="destructive">Critical path</Badge>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Release roadmap (milestones)</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Plan release targets and tie them to sprints on this board.
          </p>
          <div className="mt-3 space-y-2 text-xs">
            {releaseMilestones.length === 0 && (
              <p className="text-muted-foreground">No milestones yet. Add one below.</p>
            )}
            {releaseMilestones.map((m, idx) => (
              <div key={m.id || `${m.name}-${idx}`} className="flex items-center gap-2 rounded border p-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.name || "Untitled milestone"}</p>
                  <p className="text-muted-foreground">{m.sprint || "No sprint linked"}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{m.sprint || "Backlog"}</Badge>
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
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <p className="mb-1 text-xs text-muted-foreground">Milestone name</p>
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
                className="h-8 text-xs"
              />
            </div>
            <div className="sm:w-40">
              <p className="mb-1 text-xs text-muted-foreground">Sprint</p>
              <Select
                value={milestoneSprint || "__none__"}
                onValueChange={setMilestoneSprint}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No sprint</SelectItem>
                  {allSprints.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 text-xs gap-1"
              onClick={addMilestone}
              disabled={!milestoneName.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
              Add milestone
            </Button>
          </div>
        </div>
      </div>

      {/* Retrospective whiteboards — one per sprint */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Retrospective boards</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Each sprint gets its own whiteboard page for stickies, voting, and action items.
        </p>

        {/* Active sprint — shown prominently */}
        {activeSprint ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Active sprint</p>
            <SprintRetroButton
              boardId={boardId}
              sprint={activeSprint}
              retroBoards={retroBoards}
              patchSavedView={patchSavedView}
            />
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No active sprint. Activate a sprint to create its retro whiteboard.
          </p>
        )}

        {/* Past sprints with retro boards */}
        {(() => {
          const pastWithRetro = allSprints.filter(
            (s) => s !== activeSprint && retroBoards[normalizeSprintKey(s)]
          );
          if (!pastWithRetro.length) return null;
          return (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Past sprints</p>
              <div className="space-y-2">
                {pastWithRetro.map((s) => {
                  const pid = retroBoards[normalizeSprintKey(s)];
                  return (
                    <div key={s} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">Retro — {s}</p>
                        <p className="text-muted-foreground">Whiteboard · ID {pid.slice(-8)}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 shrink-0 text-xs">
                        <Link to={`/whiteboard/${pid}`} target="_sidebar">
                          Open
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Daily standup tracker</h3>
          <Textarea
            value={standupText}
            onChange={(e) => setStandupText(e.target.value)}
            className="mt-2 min-h-16 text-xs"
            placeholder="Yesterday / Today update"
          />
          <Input
            value={blockerText}
            onChange={(e) => setBlockerText(e.target.value)}
            className="mt-2 h-8 text-xs"
            placeholder="Blocker (optional)"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {blockerText.trim() ? "Scrum Master will be flagged for blocker." : "No blocker notification."}
            </p>
            <Button size="sm" className="h-8" onClick={addStandup}>Log standup</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Entries: {standups.length}</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Team health dashboard</h3>
          <div className="mt-3 space-y-2 text-xs">
            {workload.map((w) => (
              <div key={w.assigneeId || "unassigned"} className="flex items-center gap-3">
                <div className="w-32 truncate">{w.assignee}</div>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, w.points * 3)}%` }} />
                </div>
                <div className="w-12 text-right">{w.points} pts</div>
              </div>
            ))}
            <p className="text-muted-foreground">
              Burnout early-warning signal: <span className="font-semibold text-foreground">{burnoutSignal}</span>
            </p>
            <p className="text-muted-foreground">Sentiment samples: {(teamHealth.sentiment_samples || []).length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Test coverage report (per sprint)</h3>
        <div className="mt-3">
          <TestCoveragePanel
            bySprint={coverageBySprint}
            regressions={coverageRegressions}
            sprintList={allSprints}
            activeSprint={activeSprint}
            loading={coverageLoading}
            boardId={boardId}
          />
        </div>
      </div>
    </section>
  );
}
