import React, { useMemo } from "react";
import Link from "../../../../BetterRouter/Link";

const KANBAN_COLUMNS = ["Backlog", "In progress", "In review", "Done"];
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
  toDateLabel(item?.due_date) || toDateLabel(item?.dates?.to) || toDateLabel(item?.dates) || "No due date";

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

export default function KanbanView({ data, assigneeOptions = [], groupBy = null }) {
  const tasks = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );

  const assigneeMap = useMemo(() => {
    const map = {};
    (assigneeOptions || []).forEach((opt) => {
      if (!opt) return;
      map[opt.value] = opt.label;
    });
    return map;
  }, [assigneeOptions]);

  const normalizeStatus = (rawStatus) => {
    const s = String(rawStatus || "").toLowerCase();
    if (s.includes("done") || s.includes("complete")) return "Done";
    if (s.includes("review")) return "In review";
    if (s.includes("progress") || s.includes("doing")) return "In progress";
    if (s.includes("todo") || s.includes("backlog") || s.includes("open")) return "Backlog";
    return "Backlog";
  };

  const { columns, grouped } = useMemo(() => {
    /** @type {Record<string, any[]>} */
    const buckets = {};

    if (groupBy) {
      /** @type {any} */
      const group = groupBy;
      const fieldDef = (data?.property_name || []).find((f) => f?.name === group.name);
      const options =
        group.type === "dynamic-select"
          ? assigneeOptions
          : ((fieldDef && fieldDef.props && fieldDef.props.optionsData) || []);
      const objectLabels = {};

      const cols = (options || []).map((o) => ({
        key: String(o.value),
        label: o.label,
      }));
      cols.forEach((c) => {
        buckets[c.key] = [];
      });

      tasks.forEach((task) => {
        const raw = task[group.name];
        const resolved = getGroupValue(raw);
        const key = resolved.key;
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(task);
        if (resolved.label) objectLabels[key] = resolved.label;
      });

      Object.keys(buckets).forEach((key) => {
        if (cols.some((c) => c.key === key)) return;
        cols.push({
          key,
          label: key === "__unset__" ? `No ${group.label}` : (objectLabels[key] || key),
        });
      });

      if (buckets.__unset__ && !cols.some((c) => c.key === "__unset__")) {
        cols.push({ key: "__unset__", label: `No ${group.label}` });
      }

      return { columns: cols, grouped: buckets };
    }

    KANBAN_COLUMNS.forEach((name) => {
      buckets[name] = [];
    });
    tasks.forEach((task) => {
      const key = normalizeStatus(task.status);
      buckets[key].push(task);
    });
    return {
      columns: KANBAN_COLUMNS.map((c) => ({ key: c, label: c })),
      grouped: buckets,
    };
  }, [tasks, groupBy, data?.property_name, assigneeOptions]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <div key={column.key} className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{column.label}</h4>
              <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {(grouped[column.key] || []).length}
              </span>
            </div>
            <div className="space-y-2">
              {(grouped[column.key] || []).map((task) => (
                <Link
                  key={task.id}
                  to={`/document/${task.id}`}
                  target="_sidebar"
                  onClick={() => {}}
                  className="block w-full rounded-md border bg-background p-2 text-left hover:bg-muted/60"
                >
                  <p className="text-sm font-medium underline-offset-2 hover:underline">
                    {task.title || "Untitled task"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {assigneeMap[task.assignee] || task.assignee || "Unassigned"} ·{" "}
                    {resolveDueDate(task)}
                  </p>
                  {(task.subtasks || []).length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Subtasks ({task.subtasks.length})
                      </p>
                      <div className="space-y-1">
                        {task.subtasks.slice(0, 3).map((sub) => (
                          <div key={sub.id} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex h-3 w-3 items-center justify-center rounded border text-[9px]">
                              {(sub.status || "").toLowerCase().includes("done") ? "✓" : ""}
                            </span>
                            <span className="truncate">↳ {sub.title || "Untitled subtask"}</span>
                          </div>
                        ))}
                        {task.subtasks.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{task.subtasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              ))}
              <button
                type="button"
                className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
              >
                + Add card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}