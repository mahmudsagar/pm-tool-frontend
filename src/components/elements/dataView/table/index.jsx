import { Fragment, useMemo, useState } from "react";
import Link from "@/BetterRouter/Link";

const toDateLabel = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString().split("T")[0];
    return null;
  }
  if (typeof value === "object") {
    return toDateLabel(value.to || value.end || value.date || value.from || value.start || null);
  }
  return null;
};

const resolveDueDate = (item) =>
  toDateLabel(item?.due_date) || toDateLabel(item?.dates?.to) || toDateLabel(item?.dates) || "-";

const getGroupValue = (raw) => {
  if (raw === undefined || raw === null || raw === "") {
    return { key: "__unset__", label: null };
  }
  if (typeof raw === "object") {
    const from = toDateLabel(raw.from || raw.start || null);
    const to = toDateLabel(raw.to || raw.end || null);
    if (from && to) return { key: `${from}__${to}`, label: `${from} → ${to}` };
    if (to) return { key: to, label: to };
    if (from) return { key: from, label: from };
    return { key: "__unset__", label: null };
  }
  return { key: String(raw), label: null };
};

export default function TableView({ data, assigneeOptions = [], groupBy = null }) {
  const rows = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );

  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
  );
  const [collapsed, setCollapsed] = useState({});
  const groups = useMemo(() => {
    if (!groupBy) return [{ key: "__all__", label: "All tasks", rows }];

    const fieldDef = (data?.property_name || []).find((f) => f.name === groupBy.name);
    const options =
      groupBy.type === "dynamic-select"
        ? assigneeOptions
        : (fieldDef?.props?.optionsData || []);
    const labelMap = Object.fromEntries((options || []).map((o) => [String(o.value), o.label]));
    const buckets = {};
    const objectLabels = {};
    rows.forEach((row) => {
      const raw = row[groupBy.name];
      const resolved = getGroupValue(raw);
      const key = resolved.key;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(row);
      if (resolved.label) objectLabels[key] = resolved.label;
    });
    return Object.keys(buckets).map((key) => ({
      key,
      label: key === "__unset__" ? `No ${groupBy.label}` : (labelMap[key] || objectLabels[key] || key),
      rows: buckets[key],
    }));
  }, [groupBy, rows, data?.property_name, assigneeOptions]);

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
            {groups.map((group) => (
              <Fragment key={group.key}>
                {groupBy && (
                  <tr className="border-t bg-muted/20">
                    <td className="px-3 py-2 text-xs font-semibold text-muted-foreground" colSpan={5}>
                      {group.label} ({group.rows.length})
                    </td>
                  </tr>
                )}
                {group.rows.map((row) => (
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
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
