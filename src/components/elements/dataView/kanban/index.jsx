import React, { useEffect, useMemo, useState } from "react";
import Link from "../../../../BetterRouter/Link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

const findStatusFieldName = (fields = []) => {
  const exact = fields.find((f) => f?.name === "status");
  if (exact) return exact.name;
  const byLabel = fields.find((f) => String(f?.label || "").toLowerCase().includes("status"));
  if (byLabel) return byLabel.name;
  const byName = fields.find((f) => String(f?.name || "").toLowerCase().includes("status"));
  return byName?.name || null;
};

function SortableTaskCard({ task, assigneeMap }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 180ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md ${isDragging ? "opacity-50" : ""}`}
      {...attributes}
      {...listeners}
    >
      <Link
        to={`/document/${task.id}`}
        target="_sidebar"
        onClick={() => {}}
        className={`block w-full rounded-md border bg-background p-2 text-left transition-colors duration-150 hover:bg-muted/60 ${
          task.isSubtask ? "border-dashed bg-muted/20" : ""
        }`}
      >
        <p className="text-sm font-medium underline-offset-2 hover:underline">
          {task.isSubtask ? `↳ ${task.title || "Untitled subtask"}` : (task.title || "Untitled task")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {assigneeMap[task.assignee] || task.assignee || "Unassigned"} ·{" "}
          {resolveDueDate(task)}
        </p>
        {task.isSubtask && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Subtask of {task.parentTitle || "Parent task"}
          </p>
        )}
      </Link>
    </div>
  );
}

function DropColumn({ columnKey, children, className }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${columnKey}` });
  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-colors duration-150 ${
        isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function KanbanView({ data, assigneeOptions = [], groupBy = null, onCellChange }) {
  /** @type {any} */
  const group = groupBy;
  const tasks = useMemo(
    () =>
      (data?.property_values || [])
        .filter((item) => !item.parent_id)
        .flatMap((parent) => {
          const parentCard = { ...parent, isSubtask: false };
          const subCards = (parent.subtasks || []).map((sub, idx) => ({
            ...sub,
            id: sub.id || `${parent.id}-sub-${idx}`,
            title: sub.title || "Untitled subtask",
            parentId: parent.id,
            parentTitle: parent.title || "Untitled task",
            isSubtask: true,
          }));
          return [parentCard, ...subCards];
        }),
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
  const statusFieldName = useMemo(
    () => findStatusFieldName(data?.property_name || []),
    [data?.property_name]
  );
  const [optimisticColumns, setOptimisticColumns] = useState({});
  const [activeTaskId, setActiveTaskId] = useState(/** @type {string | null} */ (null));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    setOptimisticColumns({});
  }, [data?.property_values, group?.name]);

  const fieldName = group?.name || statusFieldName;
  const getTaskColumnKey = (task) => {
    const overridden = optimisticColumns[task.id];
    if (overridden !== undefined) return overridden;
    if (group) {
      const resolved = getGroupValue(task[group.name]);
      return resolved.key;
    }
    return normalizeStatus(task.status);
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
        const key = getTaskColumnKey(task);
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(task);
        const resolved = getGroupValue(task[group.name]);
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
      const key = getTaskColumnKey(task);
      buckets[key].push(task);
    });
    return {
      columns: KANBAN_COLUMNS.map((c) => ({ key: c, label: c })),
      grouped: buckets,
    };
  }, [tasks, groupBy, data?.property_name, assigneeOptions, optimisticColumns]);

  const taskById = useMemo(
    () => Object.fromEntries(tasks.map((t) => [t.id, t])),
    [tasks]
  );
  const activeTask = activeTaskId ? taskById[activeTaskId] : null;

  const getColumnFromDropTarget = (overId) => {
    const text = String(overId || "");
    if (text.startsWith("column-")) return text.replace("column-", "");
    if (text.startsWith("task-")) {
      const overTaskId = text.replace("task-", "");
      const overTask = taskById[overTaskId];
      return overTask ? getTaskColumnKey(overTask) : null;
    }
    return null;
  };

  const handleDragStart = (event) => {
    const id = String(event?.active?.id || "");
    if (!id.startsWith("task-")) return;
    setActiveTaskId(id.replace("task-", ""));
  };

  const handleDragEnd = (event) => {
    const activeId = String(event?.active?.id || "");
    const overId = event?.over?.id;
    setActiveTaskId(null);
    if (!activeId.startsWith("task-") || !overId) return;

    const taskId = activeId.replace("task-", "");
    const targetColumn = getColumnFromDropTarget(overId);
    const task = taskById[taskId];
    if (!task || !targetColumn || !fieldName) return;

    const currentColumn = getTaskColumnKey(task);
    if (currentColumn === targetColumn) return;

    setOptimisticColumns((prev) => ({ ...prev, [taskId]: targetColumn }));
    onCellChange?.(task, fieldName, targetColumn === "__unset__" ? "" : targetColumn);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <DropColumn key={column.key} columnKey={column.key} className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">{column.label}</h4>
                <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {(grouped[column.key] || []).length}
                </span>
              </div>
              <SortableContext
                items={(grouped[column.key] || []).map((task) => `task-${task.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {(grouped[column.key] || []).map((task) => (
                    <SortableTaskCard key={task.id} task={task} assigneeMap={assigneeMap} />
                  ))}
                  <button
                    type="button"
                    className="w-full rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    + Add card
                  </button>
                </div>
              </SortableContext>
            </DropColumn>
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-full max-w-[280px] rounded-md border bg-background p-2 shadow-lg">
            <p className="text-sm font-medium">{activeTask.title || "Untitled task"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {assigneeMap[activeTask.assignee] || activeTask.assignee || "Unassigned"} ·{" "}
              {resolveDueDate(activeTask)}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}