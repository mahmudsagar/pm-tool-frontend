import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function ChartTooltip({ x, y, visible, children }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2 py-1.5 text-xs shadow-md"
      style={{ left: x, top: y, transform: "translate(-50%, -110%)" }}
    >
      {children}
    </div>
  );
}

export function InteractiveBurndownChart({ series, total }) {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!series.length || total <= 0) {
    return <p className="text-sm text-muted-foreground">No burndown data for this sprint yet.</p>;
  }

  const maxY = total;
  const w = 100;
  const h = 48;

  const points = series.map((p, i) => {
    const x = (i / Math.max(1, series.length - 1)) * w;
    const idealY = h - (p.ideal / maxY) * h;
    const actualY = h - (p.remaining / maxY) * h;
    return { ...p, x, idealY, actualY, index: i };
  });

  const idealPoints = points.map((p) => `${p.x},${p.idealY}`).join(" ");
  const actualPoints = points.map((p) => `${p.x},${p.actualY}`).join(" ");

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    let nearest = 0;
    let minDist = Infinity;
    points.forEach((p) => {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) {
        minDist = dist;
        nearest = p.index;
      }
    });
    setHovered(nearest);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const active = hovered != null ? points[hovered] : null;

  return (
    <div className="relative space-y-2">
      <div
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full cursor-crosshair" preserveAspectRatio="none">
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
          <polyline
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth={1}
            strokeDasharray="2 2"
            points={idealPoints}
          />
          <polyline fill="none" className="stroke-primary" strokeWidth={1.5} points={actualPoints} />
          {active && (
            <>
              <line
                x1={active.x}
                y1={0}
                x2={active.x}
                y2={h}
                className="stroke-primary/40"
                strokeWidth={0.5}
              />
              <circle cx={active.x} cy={active.actualY} r={1.8} className="fill-primary" />
              <circle cx={active.x} cy={active.idealY} r={1.4} className="fill-muted-foreground" />
            </>
          )}
        </svg>
        <ChartTooltip x={mousePos.x} y={mousePos.y} visible={active != null}>
          <p className="font-medium">{active?.label}</p>
          <p className="text-muted-foreground">Remaining: {active?.remaining} pts</p>
          <p className="text-muted-foreground">Ideal: {Math.round(active?.ideal ?? 0)} pts</p>
        </ChartTooltip>
      </div>
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

export function CurrentSprintVelocityChart({ stats, sprintName }) {
  const [hovered, setHovered] = useState(null);

  if (!stats || (stats.committed === 0 && stats.completed === 0 && stats.totalItems === 0)) {
    return <p className="text-sm text-muted-foreground">No velocity data for this sprint yet.</p>;
  }

  const maxVal = Math.max(1, stats.committed, stats.completed);
  const rows = [
    { key: "committed", label: "Committed", value: stats.committed, color: "bg-amber-500/80" },
    { key: "completed", label: "Completed", value: stats.completed, color: "bg-emerald-500/80" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{sprintName || "Current sprint"}</span>
        <span className="text-muted-foreground">
          {stats.doneItems}/{stats.totalItems} stories done
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const isHovered = hovered === row.key;
          return (
            <div
              key={row.key}
              className={cn(
                "cursor-pointer rounded-md px-1 py-0.5 transition-colors",
                isHovered && "bg-muted/50"
              )}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.value} pts</span>
              </div>
              <div className="h-3 overflow-hidden rounded bg-muted">
                <div
                  className={cn("h-full rounded transition-all duration-300", row.color)}
                  style={{ width: `${Math.max(isHovered ? 8 : 4, (row.value / maxVal) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {hovered && (
        <p className="text-[10px] text-muted-foreground">
          {hovered === "committed"
            ? `${stats.committed} points committed in this sprint`
            : `${stats.completed} points completed in this sprint`}
        </p>
      )}
    </div>
  );
}

export function InteractiveVelocityChart({ bySprint, highlightSprint }) {
  const [hovered, setHovered] = useState(null);

  if (bySprint.length === 0) {
    return <p className="text-sm text-muted-foreground">No sprint velocity data yet.</p>;
  }

  const maxVal = Math.max(1, ...bySprint.flatMap((s) => [s.committed, s.completed]));

  return (
    <div className="space-y-2">
      {bySprint.map((s, idx) => {
        const active = highlightSprint && s.sprint === highlightSprint;
        const isHovered = hovered === idx;
        return (
          <div
            key={s.sprint}
            className={cn(
              "cursor-pointer space-y-1.5 rounded-lg border p-2.5 transition-colors",
              active && "border-primary bg-primary/5",
              isHovered && "bg-muted/50"
            )}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.sprint}</span>
              <span className="text-muted-foreground">
                {s.doneItems}/{s.totalItems} stories
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-16 text-muted-foreground">Committed</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-amber-500/80 transition-all duration-300"
                    style={{ width: `${Math.max(isHovered ? 6 : 4, (s.committed / maxVal) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium">{s.committed}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="w-16 text-muted-foreground">Completed</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-emerald-500/80 transition-all duration-300"
                    style={{ width: `${Math.max(isHovered ? 6 : 4, (s.completed / maxVal) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium">{s.completed}</span>
              </div>
            </div>
            {isHovered && (
              <p className="text-[10px] text-muted-foreground">
                Velocity: {s.completed} pts completed of {s.committed} committed
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusBreakdownChart({ stories }) {
  const [hovered, setHovered] = useState(null);

  const rows = useMemo(() => {
    const map = new Map();
    (stories || []).forEach((s) => {
      const key = s.status || "Unspecified";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [stories]);

  const max = Math.max(1, ...rows.map((r) => r.count));

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No status data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div
          key={row.status}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md px-1 py-0.5 transition-colors",
            hovered === idx && "bg-muted/50"
          )}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="w-28 truncate text-xs text-muted-foreground">{row.status}</div>
          <div className="h-2.5 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-primary transition-all duration-300"
              style={{
                width: `${Math.max(hovered === idx ? 8 : 4, (row.count / max) * 100)}%`,
              }}
            />
          </div>
          <div className="w-8 text-right text-xs font-medium">{row.count}</div>
        </div>
      ))}
    </div>
  );
}

export function AssigneeWorkloadChart({ stories, assigneeMap = {} }) {
  const [hovered, setHovered] = useState(null);

  const rows = useMemo(() => {
    const map = new Map();
    (stories || []).forEach((s) => {
      const key = String(s.assignee || "");
      const label = assigneeMap[key] || (key ? key : "Unassigned");
      const prev = map.get(key) || { key, label, points: 0, stories: 0 };
      const pts = Number(s.story_points);
      prev.points += Number.isFinite(pts) ? pts : 0;
      prev.stories += 1;
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => b.points - a.points);
  }, [stories, assigneeMap]);

  const max = Math.max(1, ...rows.map((r) => r.points));

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No assignee workload data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row, idx) => (
        <div
          key={row.key || "unassigned"}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md px-1 py-0.5 transition-colors",
            hovered === idx && "bg-muted/50"
          )}
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="w-28 truncate text-xs">{row.label}</div>
          <div className="h-2.5 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-sky-500/80 transition-all duration-300"
              style={{
                width: `${Math.max(hovered === idx ? 8 : 4, (row.points / max) * 100)}%`,
              }}
            />
          </div>
          <div className="w-14 text-right text-xs font-medium">{row.points} pts</div>
        </div>
      ))}
      {hovered != null && rows[hovered] && (
        <p className="text-[10px] text-muted-foreground">
          {rows[hovered].label}: {rows[hovered].stories} stories, {rows[hovered].points} pts
        </p>
      )}
    </div>
  );
}

export function CompletionDonut({ completed, total, label = "Complete" }) {
  const [hovered, setHovered] = useState(false);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="96" height="96" viewBox="0 0 96 96" className="cursor-pointer">
        <circle cx="48" cy="48" r={r} className="stroke-muted" strokeWidth="10" fill="none" />
        <circle
          cx="48"
          cy="48"
          r={r}
          className="stroke-primary transition-all duration-500"
          strokeWidth="10"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ strokeWidth: hovered ? 12 : 10 }}
        />
        <text x="48" y="48" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-semibold">
          {pct}%
        </text>
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {hovered && (
        <p className="text-[10px] text-muted-foreground">
          {completed} / {total} pts
        </p>
      )}
    </div>
  );
}
