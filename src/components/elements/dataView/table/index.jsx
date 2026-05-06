import { Fragment, useMemo, useState } from "react";
import Link from "@/BetterRouter/Link";

const resolveDueDate = (item) => {
  if (item?.due_date) return item.due_date;
  const range = item?.dates;
  if (range?.to) {
    const d = new Date(range.to);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return "-";
};

export default function TableView({ data, assigneeOptions = [] }) {
  const rows = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );

  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
  );
  const [collapsed, setCollapsed] = useState({});

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
              <Fragment key={row.id}>
                <tr className="border-t hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">
                    {(row.subtasks || []).length > 0 && (
                      <button
                        type="button"
                        className="mr-1 text-xs text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsed((prev) => ({ ...prev, [row.id]: !prev[row.id] }));
                        }}
                      >
                        {collapsed[row.id] ? "▶" : "▼"}
                      </button>
                    )}
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
                  <td className="px-3 py-2">{resolveDueDate(row)}</td>
                </tr>
                {!collapsed[row.id] && (row.subtasks || []).map((sub) => (
                  <tr key={sub.id} className="border-t bg-muted/30 hover:bg-muted/50">
                    <td className="px-3 py-2 pl-8 text-xs">
                      <Link
                        to={`/document/${sub.id}`}
                        target="_sidebar"
                        className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        ↳ {sub.title || "Untitled subtask"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{sub.status || row.status || "Backlog"}</td>
                    <td className="px-3 py-2 text-xs">{sub.priority || row.priority || "Medium"}</td>
                    <td className="px-3 py-2 text-xs">
                      {assigneeMap[sub.assignee] || sub.assignee || assigneeMap[row.assignee] || row.assignee || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">{resolveDueDate(sub) !== "-" ? resolveDueDate(sub) : resolveDueDate(row)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
