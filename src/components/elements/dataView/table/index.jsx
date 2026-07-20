import { Fragment, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import Link from "@/BetterRouter/Link";
import {
  clampScoreValue,
  isScoreFieldName,
  SCORE_MAX,
  SCORE_MIN,
} from "@/components/elements/dataView/scrum/scrumBoardConstants";
import LabelBadge from "@/components/elements/dataView/scrum/LabelBadge";
import LabelsField from "@/components/elements/dataView/scrum/LabelsField";
import EpicBadge from "@/components/elements/dataView/scrum/EpicBadge";
import EpicField from "@/components/elements/dataView/scrum/EpicField";
import { parseLabelsString } from "@/components/elements/dataView/scrum/labelUtils";
import { parseEpicValue } from "@/components/elements/dataView/scrum/epicUtils";
import DodChecklistField from "@/components/elements/dataView/scrum/DodChecklistField";
import { dodChecklistSummary } from "@/components/elements/dataView/scrum/dodUtils";
import { filterDependencyOptionsForTask } from "@/components/elements/dataView/scrum/dependencyOptionsUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

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

const normalizeSelectLikeValue = (value, options = []) => {
  if (value === undefined || value === null || value === "") return "";
  const base =
    typeof value === "object"
      ? (value.value ?? value.id ?? value.key ?? value.label ?? "")
      : value;
  const text = String(base).trim();
  if (!text) return "";
  const byValue = (options || []).find((opt) => String(opt?.value ?? "").trim() === text);
  if (byValue) return String(byValue.value);
  const lowered = text.toLowerCase();
  const byLabel = (options || []).find((opt) => String(opt?.label ?? "").trim().toLowerCase() === lowered);
  if (byLabel) return String(byLabel.value);
  return text;
};

const DEPENDENCY_FIELDS = new Set(["depends_on"]);
const isDependencyField = (field) => {
  const name = String(field?.name || "").toLowerCase();
  const label = String(field?.label || "").toLowerCase();
  if (DEPENDENCY_FIELDS.has(name)) return true;
  return label.includes("depend") || label.includes("block");
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

export default function TableView({ data, assigneeOptions = [], groupBy = null, onCellChange, dependencyOptions: dependencyOptionsProp = [], filterDependenciesBySprint = false, labelRegistry = {}, onLabelRegistryChange, epicRegistry = {}, onEpicRegistryChange }) {
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
  const [dependencyQueryByCell, setDependencyQueryByCell] = useState({});
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
  const dependencyOptions = useMemo(() => {
    if (Array.isArray(dependencyOptionsProp) && dependencyOptionsProp.length) {
      return dependencyOptionsProp;
    }
    const byId = new Map();
    (data?.property_values || []).forEach((item) => {
      if (!item?.id) return;
      const label = item.title || item.task_id || item.id;
      byId.set(String(item.id), { value: String(item.id), label, taskId: item.task_id });
    });
    return Array.from(byId.values());
  }, [data?.property_values, dependencyOptionsProp]);

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
    const selectValue = normalizeSelectLikeValue(value) || "__empty__";
    const commonClass = isSubtask
      ? "h-7 w-full border-0 bg-transparent px-0 text-xs shadow-none outline-none focus:ring-0"
      : "h-8 w-full border-0 bg-transparent px-0 text-xs shadow-none outline-none focus:ring-0";

    if (isDependencyField(field)) {
      const cellKey = `${item?.id || "row"}:${field.name}`;
      const query = dependencyQueryByCell[cellKey] || "";
      const rowDependencyOptions = filterDependenciesBySprint
        ? filterDependencyOptionsForTask(dependencyOptions, data?.property_values, item)
        : dependencyOptions.filter((opt) => String(opt.value) !== String(item?.id));
      const filteredDependencyOptions = rowDependencyOptions.filter((opt) => {
        const q = String(query || "").trim().toLowerCase();
        if (!q) return true;
        return (
          String(opt.label || "").toLowerCase().includes(q) ||
          String(opt.taskId || "").toLowerCase().includes(q) ||
          String(opt.value || "").toLowerCase().includes(q)
        );
      });
      const current =
        dependencyOptions.find((opt) =>
          String(opt.value) === String(value) || String(opt.taskId || "") === String(value || "")
        ) || null;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-start px-0 font-normal hover:bg-transparent ${isSubtask ? "h-7 text-xs" : "h-8 text-xs"}`}
            >
              {current ? current.label : (value || "Select task")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search task..."
                value={query}
                onValueChange={(next) => {
                  setDependencyQueryByCell((prev) => ({ ...prev, [cellKey]: next }));
                  if (next) {
                    const q = String(next).trim().toLowerCase();
                    const previewMatches = dependencyOptions.filter((opt) => (
                      String(opt.label || "").toLowerCase().includes(q) ||
                      String(opt.taskId || "").toLowerCase().includes(q) ||
                      String(opt.value || "").toLowerCase().includes(q)
                    ));
                    console.log("[DependencyPicker][Table] search", {
                      field: field.name,
                      query: next,
                      totalOptions: dependencyOptions.length,
                      filteredCount: previewMatches.length,
                      topMatches: previewMatches.slice(0, 5).map((o) => ({ label: o.label, taskId: o.taskId, value: o.value })),
                    });
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>No tasks found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => commitFieldChange(item, field, "")}>
                    <span className="mr-2 h-4 w-4" />
                    Clear
                  </CommandItem>
                  {filteredDependencyOptions.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.taskId || ""}`}
                      onSelect={() => {
                        console.log("[DependencyPicker][Table] select", {
                          field: field.name,
                          selected: { label: opt.label, taskId: opt.taskId, value: opt.value },
                        });
                        commitFieldChange(item, field, opt.value);
                      }}
                    >
                      <Check className={`mr-2 h-4 w-4 ${String(current?.value || "") === String(opt.value) ? "opacity-100" : "opacity-0"}`} />
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    if (field.type === "select" || field.type === "dynamic-select") {
      const options = getFieldOptions(field, assigneeOptions);
      const selectValue = normalizeSelectLikeValue(value, options) || "__empty__";
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
              <SelectItem key={String(opt.value)} value={normalizeSelectLikeValue(opt.value)}>
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

    if (isScoreFieldName(field.name)) {
      return (
        <input
          type="number"
          min={SCORE_MIN}
          max={SCORE_MAX}
          step={1}
          className={`w-full ${commonClass}`}
          defaultValue={value ?? ""}
          onBlur={(e) => {
            const clamped = clampScoreValue(e.target.value);
            e.target.value = clamped;
            commitFieldChange(item, field, clamped);
          }}
        />
      );
    }

    if (field.name === "epic" || field.type === "epic") {
      const epic = parseEpicValue(value);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex w-full items-center text-left ${isSubtask ? "min-h-7" : "min-h-8"}`}
            >
              {epic ? (
                <EpicBadge name={epic} epicRegistry={epicRegistry} size="sm" />
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <EpicField
              compact
              value={value ?? ""}
              epicRegistry={epicRegistry}
              onRegistryChange={onEpicRegistryChange}
              onChange={(next) => commitFieldChange(item, field, next)}
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (field.name === "labels" || field.type === "labels") {
      const labels = parseLabelsString(value);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex w-full flex-wrap gap-1 text-left ${isSubtask ? "min-h-7" : "min-h-8"}`}
            >
              {labels.length > 0 ? (
                labels.map((name) => (
                  <LabelBadge key={name} name={name} labelRegistry={labelRegistry} size="sm" />
                ))
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <LabelsField
              compact
              value={value ?? ""}
              labelRegistry={labelRegistry}
              onRegistryChange={onLabelRegistryChange}
              onChange={(next) => commitFieldChange(item, field, next)}
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (field.name === "dod_checklist" || field.type === "dod_checklist") {
      const summary = dodChecklistSummary(value);
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex w-full items-center text-left ${isSubtask ? "min-h-7" : "min-h-8"}`}
            >
              {summary ? (
                <span className="text-xs">
                  DoD {summary.done}/{summary.total}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <DodChecklistField
              compact
              value={value ?? ""}
              onChange={(next) => commitFieldChange(item, field, next)}
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
                        {row.overdue && (
                          <span className="ml-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            Overdue
                          </span>
                        )}
                      </td>
                      {activeColumns.map((field) => (
                        <td key={`${row.id}-${field.name}`} className="px-3 py-2">
                          {field.type === "daterange" && !onCellChange
                            ? renderRangeValue(row[field.name])
                            : field.type === "dynamic-select" && !onCellChange
                              ? (assigneeMap[row[field.name]] || row[field.name] || "-")
                              : field.type === "select" && !onCellChange
                                ? (getFieldOptions(field, assigneeOptions).find((o) => normalizeSelectLikeValue(o.value) === normalizeSelectLikeValue(row[field.name]))?.label || normalizeSelectLikeValue(row[field.name]) || "-")
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
                          {sub.overdue && (
                            <span className="ml-2 inline-flex rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                              Overdue
                            </span>
                          )}
                        </td>
                        {activeColumns.map((field) => (
                          <td key={`${sub.id}-${field.name}`} className="px-3 py-2 text-xs">
                            {field.type === "daterange" && !onCellChange
                              ? renderRangeValue(sub[field.name] ?? row[field.name])
                              : field.type === "dynamic-select" && !onCellChange
                                ? (assigneeMap[sub[field.name]] || sub[field.name] || assigneeMap[row[field.name]] || row[field.name] || "-")
                                : field.type === "select" && !onCellChange
                                  ? (getFieldOptions(field, assigneeOptions).find((o) => normalizeSelectLikeValue(o.value) === normalizeSelectLikeValue(sub[field.name]))?.label || normalizeSelectLikeValue(sub[field.name]) || "-")
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
