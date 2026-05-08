import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DONE_KEYS = ["done", "completed", "complete", "closed"];

const normalize = (v) => String(v || "").trim().toLowerCase();
const isDone = (status) => DONE_KEYS.some((k) => normalize(status).includes(k));

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a, b) => {
  const start = toDate(a);
  const end = toDate(b);
  if (!start || !end) return null;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const toPoints = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ScrumReportsSection({ data, activeSprint = "" }) {
  const [reportScope, setReportScope] = useState("overall");
  const stories = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );
  const scopedStories = useMemo(() => {
    if (reportScope === "sprint" && activeSprint) {
      return stories.filter((s) => String(s.sprint || "") === String(activeSprint));
    }
    return stories;
  }, [activeSprint, reportScope, stories]);

  const bySprint = useMemo(() => {
    const map = new Map();
    scopedStories.forEach((s) => {
      const sprint = String(s.sprint || "Unscheduled");
      const points = toPoints(s.story_points);
      const done = isDone(s.status);
      const prev = map.get(sprint) || { sprint, committed: 0, completed: 0, totalItems: 0, doneItems: 0 };
      prev.committed += points;
      prev.completed += done ? points : 0;
      prev.totalItems += 1;
      prev.doneItems += done ? 1 : 0;
      map.set(sprint, prev);
    });
    return [...map.values()].sort((a, b) => a.sprint.localeCompare(b.sprint));
  }, [scopedStories]);

  const currentSprint = bySprint[bySprint.length - 1] || null;

  const statusFlow = useMemo(() => {
    const map = new Map();
    scopedStories.forEach((s) => {
      const key = s.status || "Unspecified";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [scopedStories]);

  const cycleAndLead = useMemo(() => {
    const doneStories = scopedStories.filter((s) => isDone(s.status));
    const cycle = [];
    const lead = [];
    doneStories.forEach((s) => {
      const cycleDays = daysBetween(s.start_date || s.createdAt, s.updatedAt);
      const leadDays = daysBetween(s.createdAt, s.updatedAt);
      if (cycleDays !== null) cycle.push(cycleDays);
      if (leadDays !== null) lead.push(leadDays);
    });
    const avg = (arr) => (arr.length ? Math.round((arr.reduce((x, y) => x + y, 0) / arr.length) * 10) / 10 : 0);
    return { avgCycle: avg(cycle), avgLead: avg(lead), sample: doneStories.length };
  }, [scopedStories]);

  const blockedCount = useMemo(
    () =>
      scopedStories.filter(
        (s) =>
          Boolean(s.risk_flag) ||
          normalize(s.status).includes("blocked") ||
          normalize(s.type) === "blocker"
      ).length,
    [scopedStories]
  );

  const reportCards = [
    { label: "Total stories", value: scopedStories.length },
    { label: "Blocked items", value: blockedCount },
    { label: "Avg cycle time (days)", value: cycleAndLead.avgCycle },
    { label: "Avg lead time (days)", value: cycleAndLead.avgLead },
  ];

  const maxFlow = Math.max(1, ...statusFlow.map((x) => x.count));

  return (
    <section className="space-y-5 text-left">
      <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
        <Button
          size="sm"
          variant={reportScope === "overall" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setReportScope("overall")}
        >
          Overall reports
        </Button>
        <Button
          size="sm"
          variant={reportScope === "sprint" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setReportScope("sprint")}
          disabled={!activeSprint}
        >
          Sprint reports {activeSprint ? `(${activeSprint})` : ""}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Velocity (Committed vs Completed)</h3>
          <div className="mt-3 space-y-2">
            {bySprint.length === 0 && <p className="text-sm text-muted-foreground">No sprint data yet.</p>}
            {bySprint.map((s) => (
              <div key={s.sprint} className="rounded border p-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{s.sprint}</span>
                  <span>{s.doneItems}/{s.totalItems} done</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">Committed: {s.committed}</Badge>
                  <Badge variant="secondary">Completed: {s.completed}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Sprint Burndown Snapshot</h3>
          <div className="mt-3 text-sm">
            {currentSprint ? (
              <>
                <p className="text-muted-foreground">Current sprint: <span className="font-medium text-foreground">{currentSprint.sprint}</span></p>
                <p className="mt-2">Committed points: <span className="font-semibold">{currentSprint.committed}</span></p>
                <p>Completed points: <span className="font-semibold">{currentSprint.completed}</span></p>
                <p>Remaining points: <span className="font-semibold">{Math.max(0, currentSprint.committed - currentSprint.completed)}</span></p>
              </>
            ) : (
              <p className="text-muted-foreground">No sprint data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Cumulative Flow (Current)</h3>
        <div className="mt-3 space-y-2">
          {statusFlow.length === 0 && <p className="text-sm text-muted-foreground">No workflow data yet.</p>}
          {statusFlow.map((row) => (
            <div key={row.status} className="flex items-center gap-3">
              <div className="w-40 truncate text-xs text-muted-foreground">{row.status}</div>
              <div className="h-2 flex-1 rounded bg-muted">
                <div
                  className="h-2 rounded bg-primary"
                  style={{ width: `${Math.max(6, Math.round((row.count / maxFlow) * 100))}%` }}
                />
              </div>
              <div className="w-10 text-right text-xs font-medium">{row.count}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Reports are calculated from current board stories and update in real time as tasks move.
      </p>
    </section>
  );
}

