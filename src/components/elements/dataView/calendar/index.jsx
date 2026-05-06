import { useMemo } from "react";
import { useState } from "react";

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

export default function CalendarView({ data }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const tasks = useMemo(
    () =>
      (data?.property_values || [])
        .filter((item) => !item.parent_id)
        .map((task) => ({
          ...task,
          scheduleDate: task.due_date || task.start_date || null,
        })),
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

  const cells = useMemo(() => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs"
            onClick={() => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            {">"}
          </button>
          <p className="text-sm font-medium">
            {currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button type="button" className="rounded-md border px-3 py-1.5">Month</button>
          <button type="button" className="rounded-md border px-3 py-1.5">+ Event</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`min-h-24 rounded-md border p-2 ${cell.inMonth ? "" : "bg-muted/40"}`}
          >
            <p className="text-xs text-muted-foreground">{cell.date.getDate()}</p>
            <div className="mt-1 space-y-1">
              {(taskMap[cell.key] || [])
                .slice(0, 2)
                .map((task) => (
                  <div key={task.id} className="truncate rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-900">
                    {task.title || "Task"}
                  </div>
                ))}
              {(taskMap[cell.key] || []).length > 2 && (
                <div className="text-[10px] text-muted-foreground">
                  +{(taskMap[cell.key] || []).length - 2} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}