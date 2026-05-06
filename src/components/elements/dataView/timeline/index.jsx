import { useMemo, useState } from "react";
import Link from "@/BetterRouter/Link";

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const startOfQuarter = (date) => {
  const q = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), q, 1);
};

const dayDiff = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

const normalizeStatus = (rawStatus) => {
  const s = String(rawStatus || "").toLowerCase();
  if (s.includes("done") || s.includes("complete")) return "done";
  if (s.includes("review")) return "review";
  if (s.includes("progress") || s.includes("doing")) return "in-progress";
  return "backlog";
};

const statusStyle = {
  done: "bg-lime-200 text-lime-900",
  "in-progress": "bg-sky-200 text-sky-900",
  review: "bg-indigo-200 text-indigo-900",
  backlog: "bg-amber-200 text-amber-900",
};

const assigneeColors = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-indigo-100 text-indigo-800",
  "bg-rose-100 text-rose-800",
];

export default function TimelineView({
  data,
  assigneeOptions = [],
  selectedTaskId,
  onSelectTask,
}) {
  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
  );

  const [mode, setMode] = useState("month"); // week | month | quarter
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const tasks = useMemo(() => {
    const now = new Date();
    return (data?.property_values || [])
      .filter((item) => !item.parent_id)
      .map((task, index) => {
        const fallbackStart = addDays(now, index * 3);
        const fallbackEnd = addDays(fallbackStart, 14);
        const startDate = task.start_date ? new Date(task.start_date) : fallbackStart;
        const dueDate = task.due_date ? new Date(task.due_date) : fallbackEnd;
        const safeEnd = dueDate > startDate ? dueDate : addDays(startDate, 7);
        return {
          ...task,
          startDate,
          dueDate: safeEnd,
          statusKey: normalizeStatus(task.status),
          assigneeName: assigneeMap[task.assignee] || task.assignee || "Unassigned",
        };
      });
  }, [data?.property_values, assigneeMap]);

  const { rangeStart, rangeEnd, columns } = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(anchorDate);
      // Show 12 weeks window
      const end = addDays(start, 7 * 12);
      const weeks = Array.from({ length: 12 }, (_, i) => ({
        key: `w-${i}`,
        start: addDays(start, i * 7),
        end: addDays(start, (i + 1) * 7),
        label: addDays(start, i * 7).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      }));
      return { rangeStart: start, rangeEnd: end, columns: weeks };
    }

    if (mode === "quarter") {
      const start = startOfQuarter(anchorDate);
      const end = addMonths(start, 3);
      const months = Array.from({ length: 3 }, (_, i) => {
        const mStart = addMonths(start, i);
        const mEnd = addMonths(mStart, 1);
        return {
          key: `m-${mStart.getFullYear()}-${mStart.getMonth()}`,
          start: mStart,
          end: mEnd,
          label: mStart.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
        };
      });
      return { rangeStart: start, rangeEnd: end, columns: months };
    }

    // month mode: show 3 months per view
    const start = startOfMonth(anchorDate);
    const end = addMonths(start, 3);
    const months = Array.from({ length: 3 }, (_, i) => {
      const mStart = addMonths(start, i);
      const mEnd = addMonths(mStart, 1);
      return {
        key: `m-${mStart.getFullYear()}-${mStart.getMonth()}`,
        start: mStart,
        end: mEnd,
        label: mStart.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      };
    });
    return { rangeStart: start, rangeEnd: end, columns: months };
  }, [mode, anchorDate]);

  const totalDays = Math.max(1, dayDiff(rangeStart, rangeEnd));
  const todayLeft = `${Math.min(100, Math.max(0, (dayDiff(rangeStart, new Date()) / totalDays) * 100))}%`;

  const navigate = (dir) => {
    setAnchorDate((d) => {
      if (mode === "week") return addDays(d, dir * 7 * 4); // 4-week jump
      if (mode === "quarter") return addMonths(d, dir * 3);
      return addMonths(d, dir * 1);
    });
  };

  const gridColsClass =
    mode === "week" ? "grid-cols-12" : "grid-cols-3";

  return (
    <div className="space-y-4">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 py-2 text-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs text-muted-foreground"
              onClick={() => navigate(-1)}
            >
              ←
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs text-muted-foreground"
              onClick={() => navigate(1)}
            >
              →
            </button>
          </div>
          <span className="font-medium text-foreground">
            {rangeStart.toLocaleDateString(undefined, { month: "short", year: "numeric" })} –{" "}
            {rangeEnd.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="inline-flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`px-3 py-1 ${mode === "week" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`px-3 py-1 ${mode === "month" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setMode("quarter")}
              className={`px-3 py-1 ${mode === "quarter" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
            >
              Quarter
            </button>
          </div>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 font-medium text-xs text-foreground"
            onClick={() => setAnchorDate(new Date())}
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Main timeline grid */}
        <div className="overflow-x-auto flex-1">
          <div className="grid min-w-[720px] grid-cols-[200px_minmax(0,1fr)] text-xs">
          <div className="border-b border-r bg-muted px-3 py-2 font-medium text-muted-foreground">
            Task / Assignee
          </div>
          <div className="border-b bg-muted">
            <div className={`grid border-l ${gridColsClass}`}>
              {columns.map((c, i) => (
                <div
                  key={c.key}
                  className={`border-r px-3 py-2 ${i === 1 ? "font-medium text-foreground" : "text-muted-foreground"} ${i === columns.length - 1 ? "border-r-0" : ""}`}
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>
          {tasks.map((task, idx) => {
            const leftPercent = (dayDiff(rangeStart, task.startDate) / totalDays) * 100;
            const widthPercent = (Math.max(1, dayDiff(task.startDate, task.dueDate)) / totalDays) * 100;
            const initials = task.assigneeName
              .split(" ")
              .filter(Boolean)
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const colorClass = assigneeColors[idx % assigneeColors.length];
            const isSelected = selectedTaskId === task.id;

            return (
              <div key={task.id} className="contents">
                <Link
                  to={`/document/${task.id}`}
                  target="_sidebar"
                  onClick={() => onSelectTask?.(task.id)}
                  className={`flex items-center gap-2 border-b border-r px-3 py-2 ${isSelected ? "bg-primary/5" : "hover:bg-muted/60"}`}
                >
                  <span className="text-[10px] text-muted-foreground">—</span>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium ${colorClass}`}>
                    {initials || "NA"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{task.title || "Untitled task"}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{task.assigneeName}</div>
                  </div>
                </Link>
                <Link
                  to={`/document/${task.id}`}
                  target="_sidebar"
                  onClick={() => onSelectTask?.(task.id)}
                  className={`relative border-b block ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <div className={`grid h-12 ${gridColsClass}`}>
                    {columns.map((c, idx) => (
                      <div
                        key={c.key}
                        className={`border-r ${mode !== "week" && idx === 1 ? "bg-blue-50/40" : ""} ${idx === columns.length - 1 ? "border-r-0" : ""}`}
                      />
                    ))}
                  </div>
                  <div
                    className={`absolute top-3 inline-flex h-5 items-center rounded px-2 text-[11px] font-medium shadow-sm ${statusStyle[task.statusKey]} ${
                      isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                    }`}
                    style={{
                      left: `${Math.min(96, Math.max(0, leftPercent))}%`,
                      width: `${Math.max(8, Math.min(96, widthPercent))}%`,
                    }}
                  >
                    {task.status || "Backlog"}
                  </div>
                  <div className="absolute top-0 bottom-0 w-[2px] bg-sky-500" style={{ left: todayLeft }}>
                    <div className="absolute left-[-3px] top-0 h-2 w-2 rounded-full bg-sky-500" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Right-side health summary panel */}
        <aside className="hidden w-64 shrink-0 rounded-md border bg-background p-3 text-xs md:block">
          <h3 className="mb-2 text-sm font-semibold">Board health</h3>
          <div className="mb-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total tasks</span>
              <span className="font-medium">{tasks.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">In progress</span>
              <span className="font-medium">
                {tasks.filter((t) => t.statusKey === "in-progress").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Done</span>
              <span className="font-medium">
                {tasks.filter((t) => t.statusKey === "done").length}
              </span>
            </div>
          </div>

          {selectedTaskId && (
            (() => {
              const t = tasks.find((x) => x.id === selectedTaskId);
              if (!t) return null;
              return (
                <div className="mt-2 space-y-2 rounded-md border bg-muted/40 p-2">
                  <div className="text-xs font-semibold">Selected task</div>
                  <div className="text-sm font-medium">{t.title || "Untitled task"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.assigneeName} ·{" "}
                    {t.startDate.toLocaleDateString()} – {t.dueDate.toLocaleDateString()}
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 ${statusStyle[t.statusKey]}`}>
                      {t.status || "Backlog"}
                    </span>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800">
                      {Math.max(1, dayDiff(t.startDate, t.dueDate))} days
                    </span>
                  </div>
                </div>
              );
            })()
          )}

          <div className="mt-4 space-y-1">
            <div className="text-xs font-semibold">Legend</div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-lime-400" /> Done
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-sky-300" /> In progress
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-amber-300" /> Backlog
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-indigo-300" /> Blocked
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rotate-45 rounded-sm bg-sky-500" /> Milestone
              </span>
            </div>
          </div>
        </aside>
      </div>
      </div>

    </div>
  );
}