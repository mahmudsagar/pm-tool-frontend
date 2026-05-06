import React, { useMemo, useState } from "react";
import Link from "@/BetterRouter/Link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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

const findDateField = (fields = []) => {
  const rangeField = fields.find((f) => f?.type === "daterange");
  if (rangeField) return rangeField;
  const dueField = fields.find((f) => f?.name === "due_date");
  if (dueField) return dueField;
  const dateField = fields.find((f) => f?.type === "date");
  return dateField || null;
};

const addDays = (dateKey, days) => {
  const d = new Date(dateKey);
  d.setDate(d.getDate() + days);
  return fmtDateKey(d);
};

export default function CalendarView({ data, selectedTaskId, onSelectTask, onCellChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState("month"); // week | month | quarter
  const [collapsedParents, setCollapsedParents] = useState({});
  const [optimisticDateById, setOptimisticDateById] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(/** @type {string | null} */ (null));
  const dateField = useMemo(() => findDateField(data?.property_name || []), [data?.property_name]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
      const effectiveDate = optimisticDateById[task.id] ?? task.scheduleDate;
      if (!effectiveDate) return;
      if (!grouped[effectiveDate]) grouped[effectiveDate] = [];
      grouped[effectiveDate].push({ ...task, scheduleDate: effectiveDate });
    });
    return grouped;
  }, [tasks, optimisticDateById]);

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

  const handleTaskDropToDate = (taskId, targetDateKey) => {
    if (!onCellChange || !dateField) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (dateField.type === "daterange") {
      const from = toDateKey(task?.dates?.from || task?.start_date || task?.dates?.start || null);
      const to = toDateKey(task?.dates?.to || task?.due_date || task?.dates?.end || null);
      let nextFrom = targetDateKey;
      let nextTo = targetDateKey;
      if (from && to) {
        const start = new Date(from);
        const end = new Date(to);
        const duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        nextFrom = targetDateKey;
        nextTo = addDays(targetDateKey, duration);
      }
      onCellChange(task, dateField.name, { from: nextFrom, to: nextTo });
      return;
    }
    onCellChange(task, dateField.name, targetDateKey);
  };

  const taskById = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, { ...t, scheduleDate: optimisticDateById[t.id] ?? t.scheduleDate }])),
    [tasks, optimisticDateById]
  );
  const activeTask = activeTaskId ? taskById[activeTaskId] : null;

  const handleDragStart = (event) => {
    const id = String(event?.active?.id || "");
    if (!id.startsWith("task-")) return;
    setActiveTaskId(id.replace("task-", ""));
  };

  const handleDragEnd = (event) => {
    const id = String(event?.active?.id || "");
    const overId = String(event?.over?.id || "");
    setActiveTaskId(null);
    if (!id.startsWith("task-") || !overId.startsWith("date-")) return;
    const taskId = id.replace("task-", "");
    const targetDateKey = overId.replace("date-", "");
    setOptimisticDateById((prev) => ({ ...prev, [taskId]: targetDateKey }));
    handleTaskDropToDate(taskId, targetDateKey);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => navigate(-1)}>{"<"}</button>
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => navigate(1)}>{">"}</button>
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
              <button type="button" onClick={() => setMode("week")} className={`px-3 py-1 ${mode === "week" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}>Week</button>
              <button type="button" onClick={() => setMode("month")} className={`px-3 py-1 ${mode === "month" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}>Month</button>
              <button type="button" onClick={() => setMode("quarter")} className={`px-3 py-1 ${mode === "quarter" ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}>Quarter</button>
            </div>
            <button type="button" className="rounded-md border px-3 py-1.5 font-medium text-foreground" onClick={() => setCurrentDate(new Date())}>Today</button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
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
                            onToggleParent={(id) => setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }))}
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
                    onToggleParent={(id) => setCollapsedParents((prev) => ({ ...prev, [id]: !prev[id] }))}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="hidden w-64 shrink-0 rounded-md border bg-background p-3 text-xs md:block">
            <h3 className="mb-2 text-sm font-semibold">Upcoming tasks</h3>
            <div className="space-y-2">
              {tasks
                .filter((t) => (optimisticDateById[t.id] ?? t.scheduleDate))
                .sort((a, b) => ((optimisticDateById[a.id] ?? a.scheduleDate ?? "")).localeCompare((optimisticDateById[b.id] ?? b.scheduleDate ?? "")))
                .slice(0, 10)
                .map((t) => (
                  <Link
                    key={t.id}
                    to={`/document/${t.id}`}
                    target="_sidebar"
                    onClick={() => onSelectTask?.(t.id)}
                    className={`flex w-full flex-col items-start rounded-md border px-2 py-1.5 text-left ${selectedTaskId === t.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <span className="truncate text-xs font-medium">{t.isSubtask ? `↳ ${t.title || "Untitled subtask"}` : (t.title || "Untitled task")}</span>
                    <span className="text-[11px] text-muted-foreground">{optimisticDateById[t.id] ?? t.scheduleDate ?? "No date"}</span>
                  </Link>
                ))}
              {!tasks.length && <p className="text-[11px] text-muted-foreground">No tasks scheduled yet.</p>}
            </div>
          </aside>
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="rounded border bg-background px-2 py-1 text-xs shadow-lg">
            {activeTask.isSubtask ? `↳ ${activeTask.title || "Subtask"}` : (activeTask.title || "Task")}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
  const { setNodeRef, isOver } = useDroppable({ id: `date-${cell.key}` });
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
      ref={setNodeRef}
      className={`min-h-24 rounded-md border p-2 ${
        mode === "month" && !cell.inMonth ? "bg-muted/40" : ""
      } ${isOver ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-5 w-5 items-center justify-center text-xs ${
            isToday ? "rounded-full bg-sky-500 font-semibold text-white" : "text-muted-foreground"
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
            <DraggableCalendarTask task={task} selectedTaskId={selectedTaskId} onSelectTask={onSelectTask} />
          </div>
        ))}
        {renderItems.length > limit && (
          <div className="text-[10px] text-muted-foreground">+{renderItems.length - limit} more</div>
        )}
      </div>
    </div>
  );
}

function DraggableCalendarTask({ task, selectedTaskId, onSelectTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: "transform 180ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : ""}
      {...attributes}
      {...listeners}
    >
      <Link
        to={`/document/${task.id}`}
        target="_sidebar"
        onClick={() => onSelectTask?.(task.id)}
        className={`flex flex-1 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
          selectedTaskId === task.id
            ? "bg-sky-600 text-white"
            : task._kind === "sub"
              ? "bg-indigo-100 text-indigo-900"
              : "bg-blue-100 text-blue-900"
        }`}
      >
        <span className="truncate">{task._kind === "sub" ? `↳ ${task.title || "Subtask"}` : (task.title || "Task")}</span>
        {task.overdue && (
          <span
            className={`shrink-0 rounded-full px-1 py-0 text-[9px] font-semibold ${
              selectedTaskId === task.id ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
            }`}
          >
            !
          </span>
        )}
      </Link>
    </div>
  );
}