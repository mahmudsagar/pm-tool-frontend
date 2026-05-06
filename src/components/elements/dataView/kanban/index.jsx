import { useMemo } from "react";

const KANBAN_COLUMNS = ["Backlog", "In progress", "In review", "Done"];

export default function KanbanView({ data }) {
  const tasks = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id).slice(0, 16),
    [data?.property_values]
  );

  const grouped = useMemo(() => {
    const buckets = Object.fromEntries(KANBAN_COLUMNS.map((name) => [name, []]));
    tasks.forEach((task, index) => {
      const status = String(task.status || "").toLowerCase();
      if (status.includes("done")) buckets.Done.push(task);
      else if (status.includes("review")) buckets["In review"].push(task);
      else if (status.includes("progress")) buckets["In progress"].push(task);
      else if (index % 4 === 0) buckets["In progress"].push(task);
      else buckets.Backlog.push(task);
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
              {grouped[column].slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-md border bg-background p-2">
                  <p className="text-sm font-medium">{task.title || "Untitled task"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{task.due_date || "No due date"}</p>
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