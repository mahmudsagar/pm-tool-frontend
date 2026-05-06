import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "@/BetterRouter/Link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

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

const getInitialVisibleColumns = (fields) => {
  if (!fields.length) return [];
  const preferred = ["status", "priority", "assignee", "dates", "due_date"];
  const picked = preferred.filter((name) => fields.some((f) => f.name === name));
  if (picked.length) return picked;
  return fields.slice(0, 4).map((f) => f.name);
};

const getFieldOptions = (field, assigneeOptions) => {
  if (field.type === "dynamic-select") return assigneeOptions || [];
  return field?.props?.optionsData || [];
};

const renderRangeValue = (value) => {
  if (!value || typeof value !== "object") return "-";
  const from = toDateLabel(value.from || value.start || null);
  const to = toDateLabel(value.to || value.end || null);
  if (from && to) return `${from} → ${to}`;
  return from || to || "-";
};

const toDateObject = (value) => {
  const label = toDateLabel(value);
  if (!label) return undefined;
  const d = new Date(label);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
};

export default function TableView({ data, assigneeOptions = [], groupBy = null, onCellChange }) {
  const rows = useMemo(
    () => (data?.property_values || []).filter((item) => !item.parent_id),
    [data?.property_values]
  );
  const customColumns = useMemo(() => {
    const baseExcluded = new Set(["task_id", "title", "description"]);
    return (data?.property_name || []).filter((field) => !baseExcluded.has(field.name));
  }, [data?.property_name]);

  const assigneeMap = useMemo(
    () => Object.fromEntries((assigneeOptions || []).map((opt) => [opt.value, opt.label])),
    [assigneeOptions]
  );
  const [collapsed, setCollapsed] = useState({});
  const [visibleColumns, setVisibleColumns] = useState([]);
  useEffect(() => {
    if (!customColumns.length) {
      setVisibleColumns([]);
      return;
    }
    setVisibleColumns((prev) => {
      const available = new Set(customColumns.map((f) => f.name));
      const filteredPrev = (prev || []).filter((name) => available.has(name));
      if (filteredPrev.length) return filteredPrev;
      return getInitialVisibleColumns(customColumns);
    });
  }, [customColumns]);

  const activeColumns = useMemo(
    () => customColumns.filter((field) => visibleColumns.includes(field.name)),
    [customColumns, visibleColumns]
  );

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

  const commitFieldChange = (item, field, nextValue) => {
    if (!onCellChange || !item?.id) return;
    onCellChange(item, field.name, nextValue);
  };

  const renderEditableCell = (item, field, isSubtask = false) => {
    const value = item?.[field.name];
    const selectValue = value === undefined || value === null || value === "" ? "__empty__" : String(value);
    const commonClass = isSubtask
      ? "h-7 w-full border-0 bg-transparent px-0 text-xs shadow-none outline-none focus:ring-0"
      : "h-8 w-full border-0 bg-transparent px-0 text-xs shadow-none outline-none focus:ring-0";

    if (field.type === "select" || field.type === "dynamic-select") {
      const options = getFieldOptions(field, assigneeOptions);
      return (
        <Select
          value={selectValue}
          onValueChange={(next) => commitFieldChange(item, field, next === "__empty__" ? "" : next)}
        >
          <SelectTrigger
            className={`w-full cursor-pointer border-0 bg-transparent px-0 pr-6 text-left shadow-none ring-0 transition-colors duration-150 hover:text-foreground focus:ring-0 ${isSubtask ? "h-7 text-xs" : "h-8 text-xs"}`}
          >
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__empty__">-</SelectItem>
            {options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "date") {
      const selectedDate = toDateObject(value);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-start px-0 font-normal hover:bg-transparent ${isSubtask ? "h-7 text-xs" : "h-8 text-xs"}`}
            >
              {toDateLabel(value) || "-"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(next) => commitFieldChange(item, field, next ? toDateLabel(next) : null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (field.type === "daterange") {
      const fromLabel = toDateLabel(value?.from || value?.start || item?.start_date || null);
      const toLabel = toDateLabel(value?.to || value?.end || item?.due_date || null);
      const selectedRange = {
        from: toDateObject(fromLabel),
        to: toDateObject(toLabel),
      };
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-start px-0 font-normal hover:bg-transparent ${isSubtask ? "h-7 text-xs" : "h-8 text-xs"}`}
            >
              {fromLabel || toLabel ? `${fromLabel || "—"} → ${toLabel || "—"}` : "-"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={selectedRange}
              defaultMonth={selectedRange.from}
              numberOfMonths={2}
              onSelect={(range) =>
                commitFieldChange(item, field, {
                  from: range?.from ? toDateLabel(range.from) : null,
                  to: range?.to ? toDateLabel(range.to) : null,
                })
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <input
        className={`w-full ${commonClass}`}
        defaultValue={value ?? ""}
        onBlur={(e) => commitFieldChange(item, field, e.target.value)}
      />
    );
  };

  return (
    <div className="w-full rounded-md border bg-background">
      <div className="flex items-center justify-end border-b px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
            {customColumns.map((field) => (
              <DropdownMenuCheckboxItem
                key={field.name}
                checked={visibleColumns.includes(field.name)}
                onCheckedChange={(checked) => {
                  setVisibleColumns((prev) => {
                    if (checked) return [...new Set([...(prev || []), field.name])];
                    return (prev || []).filter((name) => name !== field.name);
                  });
                }}
              >
                {field.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Task</th>
              {activeColumns.map((field) => (
                <th key={field.name} className="px-3 py-2">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                {groupBy && (
                  <tr className="border-t bg-muted/20">
                    <td className="px-3 py-2 text-xs font-semibold text-muted-foreground" colSpan={Math.max(1, activeColumns.length + 1)}>
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
                      {activeColumns.map((field) => (
                        <td key={`${row.id}-${field.name}`} className="px-3 py-2">
                          {field.type === "daterange" && !onCellChange
                            ? renderRangeValue(row[field.name])
                            : field.type === "dynamic-select" && !onCellChange
                              ? (assigneeMap[row[field.name]] || row[field.name] || "-")
                              : field.type === "select" && !onCellChange
                                ? (getFieldOptions(field, assigneeOptions).find((o) => String(o.value) === String(row[field.name]))?.label || row[field.name] || "-")
                                : field.name === "due_date"
                                  ? resolveDueDate(row)
                                  : renderEditableCell(row, field)}
                        </td>
                      ))}
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
                        {activeColumns.map((field) => (
                          <td key={`${sub.id}-${field.name}`} className="px-3 py-2 text-xs">
                            {field.type === "daterange" && !onCellChange
                              ? renderRangeValue(sub[field.name] ?? row[field.name])
                              : field.type === "dynamic-select" && !onCellChange
                                ? (assigneeMap[sub[field.name]] || sub[field.name] || assigneeMap[row[field.name]] || row[field.name] || "-")
                                : field.type === "select" && !onCellChange
                                  ? (getFieldOptions(field, assigneeOptions).find((o) => String(o.value) === String(sub[field.name]))?.label || sub[field.name] || "-")
                                  : field.name === "due_date"
                                    ? (resolveDueDate(sub) !== "-" ? resolveDueDate(sub) : resolveDueDate(row))
                                    : renderEditableCell(sub, field, true)}
                          </td>
                        ))}
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
