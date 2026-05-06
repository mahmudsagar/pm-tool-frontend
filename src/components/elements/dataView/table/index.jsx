import { useMemo } from "react";
import Link from "@/BetterRouter/Link";

export default function TableView({ data, assigneeOptions = [] }) {
  const rows = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );

  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
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
              <tr key={row.id} className="border-t hover:bg-muted/40">
                <td className="px-3 py-2 font-medium">
                  <Link
                    to={`/document/${row.id}`}
                    target="_sidebar"
                    className="underline-offset-2 hover:underline"
                  >
                    {row.title || "Untitled task"}
                  </Link>
                </td>
                <td className="px-3 py-2">{row.status || "Backlog"}</td>
                <td className="px-3 py-2">{row.priority || "Medium"}</td>
                <td className="px-3 py-2">{assigneeMap[row.assignee] || row.assignee || "-"}</td>
                <td className="px-3 py-2">{row.due_date || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
