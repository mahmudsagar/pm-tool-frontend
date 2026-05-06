import { useMemo } from "react";

export default function TableView({ data }) {
  const rows = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id).slice(0, 8),
    [data?.property_values]
  );

  return (
    <div className="w-full rounded-md border bg-background">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Task</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Assignee</th>
              <th className="px-3 py-2">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{row.title || "Untitled task"}</td>
                <td className="px-3 py-2">{row.status || "Backlog"}</td>
                <td className="px-3 py-2">{row.priority || "Medium"}</td>
                <td className="px-3 py-2">{row.assignee || "-"}</td>
                <td className="px-3 py-2">{row.due_date || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
