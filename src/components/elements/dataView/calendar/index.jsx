import { useMemo, useState } from "react";
import Link from "@/BetterRouter/Link";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const startOfGridMonth = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return start;
};

const fmtDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toDateKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return fmtDateKey(direct);
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return fmtDateKey(value);
    return null;
  }
  if (typeof value === "object") {
    const candidate =
      value.to || value.end || value.date || value.start || value.from || null;
    return toDateKey(candidate);
  }
  return null;
};

const resolveScheduleDate = (task, parent) =>
  toDateKey(task?.due_date || task?.start_date || task?.dates || parent?.due_date || parent?.start_date || parent?.dates || null);

export default function CalendarView({ data, selectedTaskId, onSelectTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState("month"); // week | month | quarter
  const [collapsedParents, setCollapsedParents] = useState({});

  const tasks = useMemo(
    () =>
      (data?.property_values || [])
        .filter((item) => !item.parent_id)
        .flatMap((task) => {
          const parent = {
            ...task,
            scheduleDate: resolveScheduleDate(task),
            isSubtask: false,
            parentId: task.id,
          };
          const children = (task.subtasks || []).map((sub, idx) => ({
            ...sub,
            id: sub.id || `${task.id}-sub-${idx}`,
            title: sub.title || "Untitled subtask",
            scheduleDate: resolveScheduleDate(sub, task),
            isSubtask: true,
            parentId: task.id,
          }));
          return [parent, ...children];
        }),
    [data?.property_values]
  );

  const taskMap = useMemo(() => {
    const grouped = {};
    tasks.forEach((task) => {
      if (!task.scheduleDate) return;
      if (!grouped[task.scheduleDate]) grouped[task.scheduleDate] = [];
      grouped[task.scheduleDate].push(task);
    });
    return grouped;
  }, [tasks]);

  const weekCells = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { date, key: fmtDateKey(date), inMonth: true };
    });
  }, [currentDate]);

  const monthCells = useMemo(() => {
    const start = startOfGridMonth(currentDate);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return {
        date,
        key: fmtDateKey(date),
        inMonth: date.getMonth() === currentDate.getMonth(),
      };
    });
  }, [currentDate]);

  const quarterMonths = useMemo(() => {
    const q = Math.floor(currentDate.getMonth() / 3) * 3;
    return [0, 1, 2].map((offset) => new Date(currentDate.getFullYear(), q + offset, 1));
  }, [currentDate]);

  const navigate = (dir) => {
    setCurrentDate((d) => {
      if (mode === "week") {
        const nd = new Date(d);
        nd.setDate(nd.getDate() + dir * 7);
        return nd;
      }
      if (mode === "quarter") {
        return new Date(d.getFullYear(), d.getMonth() + dir * 3, 1);
      }
      return new Date(d.getFullYear(), d.getMonth() + dir * 1, 1);
    });
  };

  return (
    <div className="space-y-4">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            onClick={() => navigate(-1)}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            onClick={() => navigate(1)}
          >
            {">"}
          </button>
          <p className="text-sm font-medium">
            {mode === "week"
              ? `Week of ${weekCells[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
              : mode === "quarter"
              ? `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`
              : currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
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
            className="rounded-md border px-3 py-1.5 font-medium text-foreground"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {mode === "quarter" ? (
        <div className="mt-1 grid gap-4 lg:grid-cols-3">
          {quarterMonths.map((m) => {
            const cells = (() => {
              const start = startOfGridMonth(m);
              return Array.from({ length: 42 }, (_, i) => {
                const date = new Date(start);
                date.setDate(start.getDate() + i);
                return { date, key: fmtDateKey(date), inMonth: date.getMonth() === m.getMonth() };
              });
            })();
            return (
              <div key={`${m.getFullYear()}-${m.getMonth()}`} className="rounded-md border bg-background">
                <div className="border-b px-3 py-2 text-sm font-medium">
                  {m.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </div>
                <div className="grid grid-cols-7 gap-1 p-2">
                  {cells.map((cell) => (
                    <CalendarCell
                      key={cell.key}
                      cell={cell}
                      tasks={taskMap[cell.key] || []}
                      mode="quarter"
                      selectedTaskId={selectedTaskId}
                      onSelectTask={onSelectTask}
                      collapsedParents={collapsedParents}
                      onToggleParent={(id) =>
                        setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }))
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
          ) : (
        <div className="mt-1 grid grid-cols-7 gap-1">
          {(mode === "week" ? weekCells : monthCells).map((cell) => (
            <CalendarCell
              key={cell.key}
              cell={cell}
              tasks={taskMap[cell.key] || []}
              mode={mode}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              collapsedParents={collapsedParents}
              onToggleParent={(id) =>
                setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }))
              }
            />
          ))}
        </div>
          )}
        </div>

        {/* Sidebar with upcoming events */}
        <aside className="hidden w-64 shrink-0 rounded-md border bg-background p-3 text-xs md:block">
          <h3 className="mb-2 text-sm font-semibold">Upcoming tasks</h3>
          <div className="space-y-2">
            {tasks
              .filter((t) => t.scheduleDate)
              .sort((a, b) => (a.scheduleDate || "").localeCompare(b.scheduleDate || ""))
              .slice(0, 10)
              .map((t) => (
                <Link
                  key={t.id}
                  to={`/document/${t.id}`}
                  target="_sidebar"
                  onClick={() => onSelectTask?.(t.id)}
                  className={`flex w-full flex-col items-start rounded-md border px-2 py-1.5 text-left ${
                    selectedTaskId === t.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="truncate text-xs font-medium">
                    {t.isSubtask ? `↳ ${t.title || "Untitled subtask"}` : (t.title || "Untitled task")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t.scheduleDate || "No date"}
                  </span>
                </Link>
              ))}
            {!tasks.length && (
              <p className="text-[11px] text-muted-foreground">No tasks scheduled yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CalendarCell({
  cell,
  tasks,
  mode,
  selectedTaskId,
  onSelectTask,
  collapsedParents,
  onToggleParent,
}) {
  const isToday =
    fmtDateKey(cell.date) === fmtDateKey(new Date());
  const limit = mode === "week" ? 6 : mode === "quarter" ? 2 : 3;
  const parentTasks = tasks.filter((t) => !t.isSubtask);
  const renderItems = [];
  parentTasks.forEach((parent) => {
    renderItems.push({ ...parent, _kind: "parent" });
    if (!collapsedParents[parent.id]) {
      tasks
        .filter((t) => t.isSubtask && t.parentId === parent.id)
        .forEach((sub) => renderItems.push({ ...sub, _kind: "sub" }));
    }
  });
  tasks
    .filter((t) => t.isSubtask && !parentTasks.some((p) => p.id === t.parentId))
    .forEach((sub) => renderItems.push({ ...sub, _kind: "sub" }));

  return (
    <div
      className={`min-h-24 rounded-md border p-2 ${
        mode === "month" && !cell.inMonth ? "bg-muted/40" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-5 w-5 items-center justify-center text-xs ${
            isToday
              ? "rounded-full bg-sky-500 font-semibold text-white"
              : "text-muted-foreground"
          }`}
        >
          {cell.date.getDate()}
        </div>
      </div>
      <div className="mt-1 space-y-1">
        {renderItems.slice(0, limit).map((task) => (
          <div key={task.id} className="flex items-center gap-1">
            {task._kind === "parent" &&
              tasks.some((t) => t.isSubtask && t.parentId === task.id) && (
                <button
                  type="button"
                  className="text-[10px] text-muted-foreground"
                  onClick={() => onToggleParent?.(task.id)}
                >
                  {collapsedParents[task.id] ? "▶" : "▼"}
                </button>
              )}
            <Link
              to={`/document/${task.id}`}
              target="_sidebar"
              onClick={() => onSelectTask?.(task.id)}
              className={`flex flex-1 items-center rounded px-1.5 py-0.5 text-[10px] ${
                selectedTaskId === task.id
                  ? "bg-sky-600 text-white"
                  : task._kind === "sub"
                    ? "bg-indigo-100 text-indigo-900"
                    : "bg-blue-100 text-blue-900"
              }`}
            >
              <span className="truncate">{task._kind === "sub" ? `↳ ${task.title || "Subtask"}` : (task.title || "Task")}</span>
            </Link>
          </div>
        ))}
        {renderItems.length > limit && (
          <div className="text-[10px] text-muted-foreground">
            +{renderItems.length - limit} more
          </div>
        )}
      </div>
    </div>
  );
}