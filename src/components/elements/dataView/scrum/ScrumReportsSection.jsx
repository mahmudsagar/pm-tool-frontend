import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_SCRUM_VIEW_BLOCK } from "@/components/elements/dataView/scrum/scrumBoardConstants";
import EpicBadge from "@/components/elements/dataView/scrum/EpicBadge";
import {
  AssigneeWorkloadChart,
  CompletionDonut,
  InteractiveBurndownChart,
  CurrentSprintVelocityChart,
  StatusBreakdownChart,
} from "@/components/elements/dataView/scrum/scrumReportCharts";
import { buildAssigneeLabelMap } from "@/components/elements/dataView/scrum/taskDisplayUtils";
import TestCoveragePanel from "@/components/elements/dataView/scrum/TestCoveragePanel";
import TeamHealthDashboard from "@/components/elements/dataView/scrum/TeamHealthDashboard";
import { useTestCoverage } from "@/hooks/queries/useTestCoverageQuery";
import {
  collectEpicsFromTasks,
  listRegistryEpics,
  normalizeEpicKey,
  parseEpicValue,
  resolveEpicDisplayName,
} from "@/components/elements/dataView/scrum/epicUtils";

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

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);

function sprintStatsForStories(stories) {
  const committed = stories.reduce((sum, s) => sum + toPoints(s.story_points), 0);
  const doneStories = stories.filter((s) => isDone(s.status));
  const completed = doneStories.reduce((sum, s) => sum + toPoints(s.story_points), 0);
  return {
    totalItems: stories.length,
    doneItems: doneStories.length,
    committed,
    completed,
    remaining: Math.max(0, committed - completed),
    remainingStories: stories.length - doneStories.length,
  };
}

function buildBurndownSeries(sprintStories) {
  const total = sprintStories.reduce((sum, s) => sum + toPoints(s.story_points), 0);
  if (total === 0 || sprintStories.length === 0) return { total: 0, series: [] };

  const completions = sprintStories
    .filter((s) => isDone(s.status))
    .map((s) => ({
      date: toDate(s.updatedAt || s.createdAt),
      points: toPoints(s.story_points),
    }))
    .filter((x) => x.date)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const start =
    sprintStories.reduce((min, s) => {
      const d = toDate(s.createdAt);
      return d && (!min || d < min) ? d : min;
    }, null) || new Date();

  const end = new Date();
  const dayCount = Math.max(1, daysBetween(start, end) ?? 7);

  const series = [];
  let cumulative = 0;
  let idx = 0;
  for (let day = 0; day <= dayCount; day += 1) {
    const dayDate = new Date(start);
    dayDate.setDate(dayDate.getDate() + day);
    dayDate.setHours(23, 59, 59, 999);
    while (idx < completions.length && completions[idx].date <= dayDate) {
      cumulative += completions[idx].points;
      idx += 1;
    }
    const remaining = Math.max(0, total - cumulative);
    const ideal = Math.max(0, total * (1 - day / dayCount));
    series.push({
      day,
      label: dayDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      remaining,
      ideal,
    });
  }
  return { total, series };
}

function BurndownChart({ series, total }) {
  if (!series.length || total <= 0) {
    return <p className="text-sm text-muted-foreground">No burndown data for this sprint yet.</p>;
  }

  const maxY = total;
  const w = 100;
  const h = 48;
  const idealPoints = series
    .map((p, i) => {
      const x = (i / Math.max(1, series.length - 1)) * w;
      const y = h - (p.ideal / maxY) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const actualPoints = series
    .map((p, i) => {
      const x = (i / Math.max(1, series.length - 1)) * w;
      const y = h - (p.remaining / maxY) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full text-xs" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={0}
            y1={h * t}
            x2={w}
            y2={h * t}
            className="stroke-muted"
            strokeWidth={0.3}
          />
        ))}
        <polyline fill="none" className="stroke-muted-foreground" strokeWidth={1} strokeDasharray="2 2" points={idealPoints} />
        <polyline fill="none" className="stroke-primary" strokeWidth={1.5} points={actualPoints} />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 border-t border-dashed border-muted-foreground" />
          Ideal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-primary" />
          Remaining
        </span>
      </div>
    </div>
  );
}

function VelocityChart({ bySprint, highlightSprint }) {
  if (bySprint.length === 0) {
    return <p className="text-sm text-muted-foreground">No sprint velocity data yet.</p>;
  }
  const maxVal = Math.max(1, ...bySprint.flatMap((s) => [s.committed, s.completed]));

  return (
    <div className="space-y-3">
      {bySprint.map((s) => {
        const active = highlightSprint && s.sprint === highlightSprint;
        return (
          <div key={s.sprint} className={`space-y-1 rounded border p-2 ${active ? "border-primary bg-primary/5" : ""}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.sprint}</span>
              <span className="text-muted-foreground">
                {s.doneItems}/{s.totalItems} stories
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-16 text-muted-foreground">Committed</span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-amber-500/70"
                    style={{ width: `${Math.max(4, (s.committed / maxVal) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium">{s.committed}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-16 text-muted-foreground">Completed</span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-emerald-500/80"
                    style={{ width: `${Math.max(4, (s.completed / maxVal) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium">{s.completed}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SprintReport({ stories, sprintList, selectedSprint, onSelectSprint, activeSprint }) {
  const sprintStories = useMemo(
    () => stories.filter((s) => String(s.sprint || "") === String(selectedSprint)),
    [selectedSprint, stories]
  );

  const stats = useMemo(() => sprintStatsForStories(sprintStories), [sprintStories]);
  const burndown = useMemo(() => buildBurndownSeries(sprintStories), [sprintStories]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <p className="mb-1 text-xs text-muted-foreground">Sprint</p>
          <Select value={selectedSprint || ""} onValueChange={onSelectSprint}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprintList.filter(Boolean).map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                  {name === activeSprint ? " (active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSprint && selectedSprint === activeSprint && (
          <Badge variant="default" className="mb-0.5 h-6">
            Active sprint
          </Badge>
        )}
      </div>

      {!selectedSprint ? (
        <p className="text-sm text-muted-foreground">Select a sprint to view its report.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Committed pts", value: stats.committed },
              { label: "Completed pts", value: stats.completed },
              { label: "Remaining pts", value: stats.remaining },
              { label: "Stories done", value: `${stats.doneItems}/${stats.totalItems}` },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold">Burndown — {selectedSprint}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Remaining story points over time vs ideal linear burndown
              </p>
              <div className="mt-3">
                <InteractiveBurndownChart series={burndown.series} total={burndown.total} />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold">Velocity</h3>
              <p className="mt-1 text-xs text-muted-foreground">Committed vs completed for this sprint</p>
              <div className="mt-3">
                <CurrentSprintVelocityChart stats={stats} sprintName={selectedSprint} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EpicReport({ stories, epicRegistry, epicOptions, selectedEpicKey, onSelectEpic, epicFieldName = "epic" }) {
  const epicStories = useMemo(() => {
    if (!selectedEpicKey) return [];
    return stories.filter((s) => {
      const raw = parseEpicValue(s[epicFieldName] ?? s.epic);
      return normalizeEpicKey(raw) === selectedEpicKey;
    });
  }, [epicFieldName, selectedEpicKey, stories]);

  const stats = useMemo(() => sprintStatsForStories(epicStories), [epicStories]);
  const displayName = selectedEpicKey
    ? resolveEpicDisplayName(epicRegistry, epicRegistry[selectedEpicKey]?.name || selectedEpicKey)
    : "";

  const pctByPoints = pct(stats.completed, stats.committed);
  const pctByStories = pct(stats.doneItems, stats.totalItems);

  const bySprint = useMemo(() => {
    const map = new Map();
    epicStories.forEach((s) => {
      const sprint = String(s.sprint || "").trim() || "Backlog";
      if (!map.has(sprint)) map.set(sprint, []);
      map.get(sprint).push(s);
    });
    return [...map.entries()]
      .map(([sprint, items]) => ({ sprint, ...sprintStatsForStories(items) }))
      .sort((a, b) => a.sprint.localeCompare(b.sprint));
  }, [epicStories]);

  const epicMeta = selectedEpicKey ? epicRegistry[selectedEpicKey] : null;

  return (
    <div className="space-y-4">
      <div className="min-w-[240px] max-w-sm">
        <p className="mb-1 text-xs text-muted-foreground">Epic</p>
        <Select value={selectedEpicKey || ""} onValueChange={onSelectEpic}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select epic" />
          </SelectTrigger>
          <SelectContent>
            {epicOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEpicKey ? (
        <p className="text-sm text-muted-foreground">Select an epic to view progress across all sprints.</p>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <EpicBadge name={displayName} colorKey={epicMeta?.color} />
              {epicMeta?.goal ? (
                <p className="text-xs text-muted-foreground">{epicMeta.goal}</p>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Complete (points)</p>
                <p className="mt-1 text-2xl font-semibold">{pctByPoints}%</p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.completed} / {stats.committed} pts
                </p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Complete (stories)</p>
                <p className="mt-1 text-2xl font-semibold">{pctByStories}%</p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.doneItems} / {stats.totalItems} stories
                </p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Stories remaining</p>
                <p className="mt-1 text-2xl font-semibold">{stats.remainingStories}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Points remaining</p>
                <p className="mt-1 text-2xl font-semibold">{stats.remaining}</p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Epic progress</span>
                <span className="font-medium">{pctByPoints}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, pctByPoints)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Stories by sprint</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Where epic work lives — backlog and all sprints
            </p>
            <div className="mt-3 space-y-2">
              {bySprint.length === 0 && (
                <p className="text-sm text-muted-foreground">No stories linked to this epic yet.</p>
              )}
              {bySprint.map((row) => (
                <div key={row.sprint} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                  <span className="font-medium">{row.sprint}</span>
                  <div className="flex gap-2 text-muted-foreground">
                    <span>{row.doneItems}/{row.totalItems} done</span>
                    <span>{row.completed}/{row.committed} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OverallReport({ stories }) {
  const stats = useMemo(() => sprintStatsForStories(stories), [stories]);
  const blockedCount = useMemo(
    () =>
      stories.filter(
        (s) =>
          Boolean(s.risk_flag) ||
          normalize(s.status).includes("blocked") ||
          normalize(s.type) === "blocker"
      ).length,
    [stories]
  );

  const statusFlow = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      const key = s.status || "Unspecified";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [stories]);

  const maxFlow = Math.max(1, ...statusFlow.map((x) => x.count));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total stories", value: stats.totalItems },
          { label: "Blocked items", value: blockedCount },
          { label: "Completed pts", value: stats.completed },
          { label: "Remaining pts", value: stats.remaining },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Cumulative flow</h3>
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
    </div>
  );
}

export default function ScrumReportsSection({
  data,
  viewState = {},
  activeSprint = "",
  epicFieldName = "epic",
  compact = false,
  assigneeOptions = [],
  boardId,
  patchSavedView,
  teams = [],
  workspace = null,
  currentUserId = null,
}) {
  const [reportScope, setReportScope] = useState(compact ? "sprint" : "sprint");
  const [selectedSprint, setSelectedSprint] = useState(activeSprint || "");
  const [selectedEpicKey, setSelectedEpicKey] = useState("");

  useEffect(() => {
    if (activeSprint) setSelectedSprint(activeSprint);
  }, [activeSprint]);

  const stories = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );

  const sprintCfg = viewState?.scrum?.sprint_management || DEFAULT_SCRUM_VIEW_BLOCK.sprint_management;
  const epicRegistry = viewState?.scrum?.epic_registry || DEFAULT_SCRUM_VIEW_BLOCK.epic_registry || {};

  const sprintList = useMemo(() => {
    const names = new Set((sprintCfg.sprints || []).filter(Boolean));
    stories.forEach((s) => {
      if (s.sprint) names.add(String(s.sprint));
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [sprintCfg.sprints, stories]);

  const epicOptions = useMemo(() => {
    const map = new Map();
    listRegistryEpics(epicRegistry).forEach((e) => {
      map.set(normalizeEpicKey(e.name), { key: normalizeEpicKey(e.name), label: e.name });
    });
    collectEpicsFromTasks(stories).forEach((name) => {
      const key = normalizeEpicKey(name);
      if (!map.has(key)) map.set(key, { key, label: name });
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [epicRegistry, stories]);

  const effectiveSprint = selectedSprint || activeSprint || sprintList[sprintList.length - 1] || "";
  const effectiveEpicKey = selectedEpicKey || epicOptions[0]?.key || "";

  const sprintStories = useMemo(
    () => stories.filter((s) => String(s.sprint || "") === String(effectiveSprint)),
    [effectiveSprint, stories]
  );
  const sprintStats = useMemo(() => sprintStatsForStories(sprintStories), [sprintStories]);
  const burndown = useMemo(() => buildBurndownSeries(sprintStories), [sprintStories]);
  const assigneeMap = useMemo(() => buildAssigneeLabelMap(assigneeOptions), [assigneeOptions]);
  const { data: coverageData, isLoading: coverageLoading } = useTestCoverage(boardId, {
    enabled: Boolean(boardId),
  });
  const coverageBySprint = coverageData?.by_sprint || {};
  const coverageRegressions = coverageData?.regressions || [];

  if (compact) {
    return (
      <section className="space-y-4 text-left">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="m-0 text-sm text-muted-foreground">
            Report for <span className="font-semibold text-foreground">{effectiveSprint || "sprint"}</span>
          </p>
          {sprintList.length > 1 && (
            <Select value={effectiveSprint || ""} onValueChange={setSelectedSprint}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprintList.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                    {name === activeSprint ? " (active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!effectiveSprint ? (
          <p className="text-sm text-muted-foreground">Select a sprint to view its report.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Committed", value: sprintStats.committed, suffix: " pts" },
                { label: "Completed", value: sprintStats.completed, suffix: " pts" },
                { label: "Remaining", value: sprintStats.remaining, suffix: " pts" },
                { label: "Stories done", value: `${sprintStats.doneItems}/${sprintStats.totalItems}`, suffix: "" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border bg-muted/20 p-3">
                  <p className="m-0 text-[11px] text-muted-foreground">{card.label}</p>
                  <p className="m-0 mt-1 text-lg font-semibold">
                    {card.value}{card.suffix}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[auto_1fr_1fr]">
              <div className="flex items-center justify-center rounded-xl border bg-muted/10 p-4">
                <CompletionDonut
                  completed={sprintStats.completed}
                  total={sprintStats.committed}
                  label="Sprint complete"
                />
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Burndown</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Hover to inspect daily remaining points</p>
                <div className="mt-3">
                  <InteractiveBurndownChart series={burndown.series} total={burndown.total} />
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Velocity</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Committed vs completed this sprint</p>
                <div className="mt-3">
                  <CurrentSprintVelocityChart stats={sprintStats} sprintName={effectiveSprint} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Status breakdown</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Story count by workflow column</p>
                <div className="mt-3">
                  <StatusBreakdownChart stories={sprintStories} />
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Team workload</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Story points by assignee this sprint</p>
                <div className="mt-3">
                  <AssigneeWorkloadChart stories={sprintStories} assigneeMap={assigneeMap} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <TeamHealthDashboard
                compact
                data={data}
                viewState={viewState}
                patchSavedView={patchSavedView}
                assigneeOptions={assigneeOptions}
                teams={teams}
                workspace={workspace}
                currentUserId={currentUserId}
              />
              <div className="rounded-xl border p-4">
                <p className="m-0 mb-1 text-xs text-muted-foreground">Test coverage</p>
                <TestCoveragePanel
                  bySprint={coverageBySprint}
                  regressions={coverageRegressions}
                  sprintList={sprintList}
                  activeSprint={effectiveSprint}
                  loading={coverageLoading}
                  boardId={boardId}
                  compact
                />
              </div>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5 text-left">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <Button
          size="sm"
          variant={reportScope === "overall" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setReportScope("overall")}
        >
          Overall
        </Button>
        <Button
          size="sm"
          variant={reportScope === "sprint" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setReportScope("sprint")}
        >
          Sprint report
        </Button>
        <Button
          size="sm"
          variant={reportScope === "epic" ? "default" : "ghost"}
          className="h-7 text-xs"
          onClick={() => setReportScope("epic")}
        >
          Epic report
        </Button>
      </div>

      {reportScope === "overall" && <OverallReport stories={stories} />}

      {reportScope === "sprint" && (
        <SprintReport
          stories={stories}
          sprintList={sprintList}
          selectedSprint={effectiveSprint}
          onSelectSprint={setSelectedSprint}
          activeSprint={activeSprint}
        />
      )}

      {reportScope === "epic" && (
        <EpicReport
          stories={stories}
          epicRegistry={epicRegistry}
          epicOptions={epicOptions}
          selectedEpicKey={effectiveEpicKey}
          onSelectEpic={setSelectedEpicKey}
          epicFieldName={epicFieldName}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Reports are calculated from current board stories and update as tasks move.
      </p>
    </section>
  );
}
