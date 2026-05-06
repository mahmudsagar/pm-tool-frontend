import { useMemo } from "react";

const MONTH_LABELS = ["Apr", "May", "Jun", "Jul", "Aug"];

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
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

export default function TimelineView({ data, assigneeOptions = [] }) {
  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
  );

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

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (!tasks.length) {
      const now = new Date();
      return { rangeStart: addDays(now, -30), rangeEnd: addDays(now, 120) };
    }
    let minStart = tasks[0].startDate;
    let maxEnd = tasks[0].dueDate;
    tasks.forEach((t) => {
      if (t.startDate < minStart) minStart = t.startDate;
      if (t.dueDate > maxEnd) maxEnd = t.dueDate;
    });
    return {
      rangeStart: addDays(minStart, -14),
      rangeEnd: addDays(maxEnd, 14),
    };
  }, [tasks]);

  const totalDays = Math.max(1, dayDiff(rangeStart, rangeEnd));
  const todayLeft = `${Math.min(100, Math.max(0, (dayDiff(rangeStart, new Date()) / totalDays) * 100))}%`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs text-muted-foreground"
            >
              ←
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border text-xs text-muted-foreground"
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
            <button className="px-3 py-1 text-muted-foreground">Week</button>
            <button className="bg-muted px-3 py-1 font-medium text-foreground">Month</button>
            <button className="px-3 py-1 text-muted-foreground">Quarter</button>
          </div>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 font-medium text-xs text-foreground"
          >
            + Add task
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[180px_minmax(0,1fr)] text-xs">
          <div className="border-b border-r bg-muted px-3 py-2 font-medium text-muted-foreground">
            Task / Assignee
          </div>
          <div className="border-b bg-muted">
            <div className="grid grid-cols-5 border-l">
              {MONTH_LABELS.map((month, i) => (
                <div
                  key={month}
                  className={`border-r px-3 py-2 ${i === 1 ? "font-medium text-foreground" : "text-muted-foreground"} ${i === 4 ? "border-r-0" : ""}`}
                >
                  {month}
                  {i === 1 && <span className="text-xs text-muted-foreground"> ▸</span>}
                </div>
              ))}
            </div>
          </div>
          {tasks.map((task) => {
            const leftPercent = (dayDiff(rangeStart, task.startDate) / totalDays) * 100;
            const widthPercent = (Math.max(1, dayDiff(task.startDate, task.dueDate)) / totalDays) * 100;
            const initials = task.assigneeName
              .split(" ")
              .filter(Boolean)
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={task.id} className="contents">
                <div className="flex items-center gap-2 border-b border-r px-3 py-2">
                  <button className="text-[10px] text-muted-foreground">—</button>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-800">
                    {initials || "NA"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{task.title || "Untitled task"}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{task.assigneeName}</div>
                  </div>
                </div>
                <div className="relative border-b">
                  <div className="grid h-12 grid-cols-5">
                    <div className="border-r" />
                    <div className="border-r bg-blue-50/40" />
                    <div className="border-r" />
                    <div className="border-r" />
                    <div />
                  </div>
                  <div
                    className={`absolute top-3 inline-flex h-5 items-center rounded px-2 text-[11px] font-medium ${statusStyle[task.statusKey]}`}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-lime-400" /> Done
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-sky-300" /> In progress
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-300" /> Backlog
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-indigo-300" /> Blocked
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rotate-45 rounded-sm bg-sky-500" /> Milestone
        </div>
        <div className="flex items-center gap-1">
          <span className="h-[2px] w-4 bg-sky-500" /> Today
        </div>
      </div>
    </div>
  );
}