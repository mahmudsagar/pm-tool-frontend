import { useMemo } from "react";

const KANBAN_COLUMNS = ["Backlog", "In progress", "In review", "Done"];

export default function KanbanView({ data, assigneeOptions = [] }) {
  const tasks = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );

  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
  );

  const normalizeStatus = (rawStatus) => {
    const s = String(rawStatus || "").toLowerCase();
    if (s.includes("done") || s.includes("complete")) return "Done";
    if (s.includes("review")) return "In review";
    if (s.includes("progress") || s.includes("doing")) return "In progress";
    if (s.includes("todo") || s.includes("backlog") || s.includes("open")) return "Backlog";
    return "Backlog";
  };

  const grouped = useMemo(() => {
    const buckets = Object.fromEntries(KANBAN_COLUMNS.map((name) => [name, []]));
    tasks.forEach((task) => {
      const key = normalizeStatus(task.status);
      buckets[key].push(task);
    });
    return buckets;
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Website Relaunch · Kanban</p>
        <div className="flex gap-2 text-xs">
          <button type="button" className="rounded-md border px-3 py-1.5">Group by assignee</button>
          <button type="button" className="rounded-md border px-3 py-1.5">+ Add card</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((column) => (
          <div key={column} className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{column}</h4>
              <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {grouped[column].length}
              </span>
            </div>
            <div className="space-y-2">
              {grouped[column].map((task) => (
                <div key={task.id} className="rounded-md border bg-background p-2">
                  <p className="text-sm font-medium">{task.title || "Untitled task"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {assigneeMap[task.assignee] || task.assignee || "Unassigned"} · {task.due_date || "No due date"}
                  </p>
                </div>
              ))}
              <button type="button" className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
                + Add card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}