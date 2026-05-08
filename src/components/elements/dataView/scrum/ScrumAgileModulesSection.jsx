import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";

const asPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumAgileModulesSection({ data, viewState, patchSavedView }) {
  const stories = useMemo(() => (data?.property_values || []).filter((t) => !t.parent_id), [data?.property_values]);
  const scrumCfg = viewState?.scrum || DEFAULT_SCRUM_VIEW_BLOCK;
  const standups = scrumCfg.standups || [];
  const releaseMilestones = scrumCfg.release_plan?.milestones || [];
  const retro = scrumCfg.retro || DEFAULT_SCRUM_VIEW_BLOCK.retro;
  const teamHealth = scrumCfg.team_health || DEFAULT_SCRUM_VIEW_BLOCK.team_health;
  const coverageBySprint = scrumCfg.test_coverage?.by_sprint || {};

  const [standupText, setStandupText] = useState("");
  const [blockerText, setBlockerText] = useState("");
  const [retroLink, setRetroLink] = useState(retro.board_link || "");

  const dependencies = useMemo(() => {
    const edges = [];
    stories.forEach((s) => {
      const source = s.task_id || s.title || s.id;
      const dep = s.depends_on || s.blocked_by || "";
      if (!dep) return;
      edges.push({ source, target: dep, critical: asPoints(s.story_points) >= 8 });
    });
    return edges.slice(0, 12);
  }, [stories]);

  const workload = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const key = String(s.assignee || "Unassigned");
      const prev = map.get(key) || 0;
      map.set(key, prev + asPoints(s.story_points));
    });
    return [...map.entries()].map(([assignee, points]) => ({ assignee, points })).sort((a, b) => b.points - a.points);
  }, [stories]);

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

  const saveRetroBoard = () => {
    patchScrum((current) => ({
      ...current,
      retro: {
        ...(current.retro || {}),
        board_link: retroLink.trim(),
      },
    }));
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
          <div className="mt-3 space-y-2 text-xs">
            {releaseMilestones.length === 0 && <p className="text-muted-foreground">No milestones configured.</p>}
            {releaseMilestones.map((m, idx) => (
              <div key={`${m.name || "milestone"}-${idx}`} className="flex items-center justify-between rounded border p-2">
                <span>{m.name || "Untitled milestone"}</span>
                <Badge variant="outline">{m.sprint || "No sprint"}</Badge>
              </div>
            ))}
            <p className="text-muted-foreground">Milestones are stored in `saved_view.scrum.release_plan`.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Retrospective board integration</h3>
          <p className="mt-2 text-xs text-muted-foreground">Use your whiteboard link for anonymous stickies and voting.</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={retroLink}
              onChange={(e) => setRetroLink(e.target.value)}
              placeholder="https://.../whiteboard/:id"
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" onClick={saveRetroBoard}>Save</Button>
          </div>
          {retro.board_link && (
            <a href={retro.board_link} className="mt-2 inline-block text-xs text-primary underline" target="_blank" rel="noreferrer">
              Open retrospective whiteboard
            </a>
          )}
        </div>

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
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Team health dashboard</h3>
          <div className="mt-3 space-y-2 text-xs">
            {workload.map((w) => (
              <div key={w.assignee} className="flex items-center gap-3">
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

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Test coverage report (per sprint)</h3>
          <div className="mt-3 space-y-2 text-xs">
            {Object.keys(coverageBySprint).length === 0 && (
              <p className="text-muted-foreground">No coverage series yet. Add snapshot data via integration.</p>
            )}
            {Object.entries(coverageBySprint).map(([sprint, coverage]) => (
              <div key={sprint} className="flex items-center justify-between rounded border p-2">
                <span>{sprint}</span>
                <Badge variant="outline">{coverage}%</Badge>
              </div>
            ))}
            <p className="text-muted-foreground">
              Link regressions using `test_coverage_ref` custom story property.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

