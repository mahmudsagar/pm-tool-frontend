import { useMemo } from "react";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function CalendarView({ data }) {
  const tasks = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id).slice(0, 14),
    [data?.property_values]
  );

  const cells = Array.from({ length: 35 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-md border px-2 py-1 text-xs">{"<"}</button>
          <button type="button" className="rounded-md border px-2 py-1 text-xs">{">"}</button>
          <p className="text-sm font-medium">May 2026</p>
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
        {cells.map((day) => (
          <div key={day} className="min-h-24 rounded-md border p-2">
            <p className="text-xs text-muted-foreground">{day}</p>
            <div className="mt-1 space-y-1">
              {tasks
                .filter((_, index) => index % 5 === day % 5)
                .slice(0, 2)
                .map((task) => (
                  <div key={task.id} className="truncate rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-900">
                    {task.title || "Task"}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}