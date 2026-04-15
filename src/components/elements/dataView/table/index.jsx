"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from "@tanstack/react-table"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowUpIcon, ArrowDownIcon, GripVertical, PlusIcon, CopyIcon, Circle, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TableFilter from "@/components/elements/dataView/filter"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import EditPropertyModal from "./EditPropertyModal";
import Link from "@/BetterRouter/Link";
import Delete from "@/layouts/elements/components/DropdownMenuItems/items/Delete";
import { DatePickerWithRange } from "@/components/elements/editor/dynamicInput/daterangepicker";

const EMPTY_ASSIGNEE_OPTIONS = [];

// Add this new component for sortable column headers
function DraggableColumnHeader({ header, addFilter, setEditPropertyModal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.id,
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-36 shrink-0"
    >
      <DropdownMenu>
        <DropdownMenuTrigger className="w-full">
          <div className="flex items-center gap-1 px-2 py-2 text-xs font-medium text-muted-foreground">
            {flexRender(header.column.columnDef.header, header.getContext())}
            {{
              asc: <ArrowUpIcon className="h-3 w-3" />,
              desc: <ArrowDownIcon className="h-3 w-3" />,
            }[header.column.getIsSorted()] ?? null}
            <div {...attributes} {...listeners} className="ml-auto cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100">
              <GripVertical className="h-3 w-3" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setEditPropertyModal({
            open: true,
            property: {
              ...header.column.columnDef,
              label: header.column.columnDef.header,
              name: header.column.columnDef.accessorKey || header.column.columnDef.id
            }
          })}>
            Edit property
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => addFilter(header, 'ascending')}>Add ascending</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => addFilter(header, 'descending')}>Add descending</DropdownMenuItem>
          <DropdownMenuItem>Filter</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AddTaskRow() {
  return (
    <div className="flex items-center gap-2 px-[52px] py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer transition-colors border-t">
      <PlusIcon className="h-4 w-4" />
      Add Task
    </div>
  );
}

function HeaderRow({ sensors, handleDragEnd, table, addFilter, setEditPropertyModal, addNewColumn }) {
  return (
    <div className="flex items-center border-b text-xs text-muted-foreground select-none">
      <div className="w-[52px] shrink-0" />
      <div className="flex-1 min-w-[200px] px-3 py-2 font-medium">Name</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={table.getHeaderGroups()[0]?.headers.map(h => h.id) ?? []}
          strategy={horizontalListSortingStrategy}
        >
          {table.getHeaderGroups()[0]?.headers
            .filter(h => h.id !== 'title' && h.id !== 'task_id' && h.id !== 'description')
            .map(header => (
              <DraggableColumnHeader
                key={header.id}
                header={header}
                addFilter={addFilter}
                setEditPropertyModal={setEditPropertyModal}
              />
            ))}
        </SortableContext>
      </DndContext>
      <div className="w-10 flex items-center justify-center">
        <button type="button" onClick={addNewColumn} className="p-1 hover:bg-accent rounded-sm">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RowItem({ row, rows, duplicateRows, deleteRows, onRowClick }) {
  const rowData = rows[row.index];
  const isSelected = row.getIsSelected();

  return (
    <div
      className={`flex items-center group min-h-[36px] hover:bg-accent/40 transition-colors ${isSelected ? 'bg-primary/10' : ''}`}
    >
      <div
        className={`w-5 flex items-center justify-center pl-2 shrink-0 ${!isSelected ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}
      >
        <Checkbox checked={isSelected} onCheckedChange={(value) => row.toggleSelected(!!value)} />
      </div>
      <div className="w-7 flex items-center justify-center shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-1">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => duplicateRows([row.index])}>Duplicate</DropdownMenuItem>
            <Delete fileId={rowData?.id} fileType="page" onSuccess={() => deleteRows([row.index])} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="w-5 flex items-center justify-center shrink-0">
        <Circle className="h-3.5 w-3.5 fill-green-500 text-green-500" />
      </div>
      <div className="flex-1 min-w-[200px] cursor-pointer" onClick={() => onRowClick(row)}>
        <span className="block truncate px-3 py-2 text-sm hover:text-primary">
          {row.getValue('title') || 'Untitled'}
        </span>
      </div>
      {row.getVisibleCells()
        .filter(cell => cell.column.id !== 'title' && cell.column.id !== 'task_id' && cell.column.id !== 'description')
        .map(cell => (
          <div key={cell.id} className="w-36 shrink-0 text-sm">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        ))}
      <div className="w-10 shrink-0" />
    </div>
  );
}

export default function TableView({ data, assigneeOptions = EMPTY_ASSIGNEE_OPTIONS, groupBy = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sorting, setSorting] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [filters, setFilters] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [tableColumns, setTableColumns] = useState(
    data.property_name.map(col => ({
      ...col,
      deleted: false,
      hidden: false
    }))
  );
  const [rows, setRows] = useState(data.property_values);
  const [rowSelection, setRowSelection] = useState({});
  const [editPropertyModal, setEditPropertyModal] = useState({ open: false, property: null });

  const form = useForm({
    defaultValues: {
      rows: data.property_values
    }
  });

  // Sync rows when data from the server changes (e.g. after task creation)
  useEffect(() => {
    setRows(data.property_values);
    // Only reset the form if the row count or IDs have changed to avoid
    // triggering react-hook-form re-renders on every parent re-render.
    form.reset({ rows: data.property_values }, { keepDirtyValues: false });
  }, [data.property_values]);

  // Sync columns when data changes (e.g. dynamic-select options updated)
  useEffect(() => {
    setTableColumns(prev => {
      const next = data.property_name.map(col => {
        const existing = prev.find(p => p.name === col.name);
        return {
          ...col,
          deleted: existing?.deleted ?? false,
          hidden: existing?.hidden ?? false,
        };
      });
      // Bail out if names/types haven't changed to avoid a spurious re-render
      if (
        next.length === prev.length &&
        next.every((col, i) => col.name === prev[i]?.name && col.type === prev[i]?.type)
      ) {
        return prev;
      }
      return next;
    });
  }, [data.property_name]);

  // Function to add a new column
  const addNewColumn = () => {
    const newColumn = {
      name: `column_${tableColumns.length + 1}`,
      label: `New Column ${tableColumns.length + 1}`,
      type: 'text'
    };
    
    setTableColumns(prev => [...prev, newColumn]);
  };

  // Add filter management functions
  const addFilter = (header, type) => {
    // Remove any existing sorting filter for this column
    setFilters(prev => prev.filter(f => f.column !== header.id));
    
    // Add new sorting filter
    header.column.toggleSorting(type === 'ascending' ? false : true);
    setFilters(prev => [...prev, {
      id: Date.now(),
      column: header.id,
      type: type,
      value: ''
    }]);
  };

  const removeFilter = (filterId) => {
    const filterToRemove = filters.find(f => f.id === filterId);
    if (filterToRemove) {
      // Clear the sorting if we're removing a sort filter
      const column = table.getColumn(filterToRemove.column);
      if (column && (filterToRemove.type === 'ascending' || filterToRemove.type === 'descending')) {
        column.clearSorting();
      }
    }
    setFilters(prev => prev.filter(f => f.id !== filterId));
  };

  // Update the duplicateRow function to handle multiple rows
  const duplicateRows = (indices = []) => {
    const newRows = [...rows];
    const rowsToAdd = [];
    
    // If no specific indices provided, use the selected rows
    const targetIndices = indices.length > 0 ? indices : 
      Object.keys(rowSelection).map(index => parseInt(index));

    // Sort indices in reverse order to maintain correct insertion positions
    targetIndices.sort((a, b) => b - a).forEach(index => {
      const duplicatedRow = { ...newRows[index] };
      rowsToAdd.push(duplicatedRow);
    });

    // Insert all duplicated rows
    rowsToAdd.forEach(row => {
      newRows.splice(Math.max(...targetIndices) + 1, 0, row);
    });
    
    setRows(newRows);
    form.setValue('rows', newRows);
    setRowSelection({}); // Clear selection after duplication
  };

  // Add deleteRows function
  const deleteRows = (indices = []) => {
    const targetIndices = indices.length > 0 ? indices : 
      Object.keys(rowSelection).map(index => parseInt(index));
    
    const newRows = rows.filter((_, index) => !targetIndices.includes(index));
    setRows(newRows);
    form.setValue('rows', newRows);
    setRowSelection({}); // Clear selection after deletion
  };

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Initialize column order if empty
  useEffect(() => {
    if (columnOrder.length === 0 && data.property_name.length > 0) {
      setColumnOrder(data.property_name.map(col => col.name));
    }
  }, [data.property_name, columnOrder]);

  const renderCell = (column, rowIndex) => {
    const rowData = rows[rowIndex];
    const isTitle = column.id === 'title';
    
    
    return (
      <FormField
        control={form.control}
        name={`rows.${rowIndex}.${column.id}`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              {isTitle && rowData?.id ? (
                <Link to={`/document/${rowData.id}`} target="_sidebar" className="block">
                  <Input
                    {...field}
                    id={field.name}
                    className="border-0 h-auto focus-visible:ring-0 rounded-false py-2 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    readOnly
                  />
                </Link>
              ) : column.columnDef.type === 'daterange' ? (
                <DatePickerWithRange
                  value={field.value}
                  onChange={field.onChange}
                  className="border-0 h-auto rounded-none bg-transparent"
                />
              ) : (column.columnDef.type === 'select' || column.columnDef.type === 'dynamic-select') ? (() => {
                // For dynamic-select use the live assigneeOptions prop;
                // for regular select fall back to the pre-built optionsData.
                const options =
                  column.columnDef.type === 'dynamic-select'
                    ? assigneeOptions
                    : (column.columnDef.props?.optionsData ?? assigneeOptions);
                return (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id={field.name} className="w-full border-0 px-4 py-2 h-auto focus:ring-0 test-select">
                      <SelectValue placeholder="Select...">
                        {options.find(opt => opt.value === field.value)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })() : (
                <Input
                  {...field}
                  id={field.name}
                  className="border-0 h-auto focus-visible:ring-0 rounded-false py-2 px-4 test"
                />
              )}
            </FormControl>
          </FormItem>
        )}
      />
    )
  }

  // Update columns to filter out deleted and hidden properties
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => tableColumns
    .filter(column => !column.deleted && !column.hidden)
    .map((column) => ({
      id: column.name,
      accessorKey: column.name,
      header: column.label,
      type: column.type,
      props: column.props,
      cell: ({ column, row }) => renderCell(column, row.index),
      enableSorting: true,
    })), [tableColumns, rows, assigneeOptions]); // eslint-disable-line

  const table = useReactTable({
    data: rows, // Use rows state instead of data.property_values
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      columnOrder, // Add column order to state
      rowSelection,
    },
    onColumnOrderChange: setColumnOrder, // Add column order change handler
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
  });

  // Build bucketed groups when groupBy is active
  const groupedRows = useMemo(() => {
    if (!groupBy) return null;
    const tableRows = table.getRowModel().rows;

    // Resolve the full options list for this field so every possible value
    // gets a group even when no row currently holds that value.
    const fieldDef = tableColumns.find(c => c.name === groupBy.name);
    const options =
      groupBy.type === 'dynamic-select'
        ? assigneeOptions
        : (fieldDef?.props?.optionsData ?? []);

    // Pre-seed every known option as an empty bucket (preserves options order)
    const buckets = {};
    const order = [];
    options.forEach(opt => {
      const key = String(opt.value);
      buckets[key] = [];
      order.push(key);
    });

    // Place each row into the matching bucket (or the unset bucket)
    tableRows.forEach(row => {
      const rawVal = row.getValue(groupBy.name);
      const key = rawVal != null && rawVal !== '' ? String(rawVal) : '__unset__';
      if (!buckets[key]) {
        buckets[key] = [];
        order.push(key);
      }
      buckets[key].push(row);
    });

    // Always include the "unset" bucket last (even if empty)
    if (!buckets['__unset__']) {
      buckets['__unset__'] = [];
      order.push('__unset__');
    }

    return order.map(key => ({
      value: key,
      label:
        key === '__unset__'
          ? `No ${groupBy.label}`
          : (options.find(o => o.value === key)?.label || key),
      count: buckets[key].length,
      rows: buckets[key],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, rows, tableColumns, assigneeOptions]);

  // Toggle a group's collapsed state
  const toggleGroup = (groupValue) => {
    setCollapsedGroups(prev => ({ ...prev, [groupValue]: !prev[groupValue] }));
  };

  // Accent colours for group headers — cycles when there are more groups than colours
  const GROUP_COLORS = [
    'text-blue-500 fill-blue-500',
    'text-emerald-500 fill-emerald-500',
    'text-orange-500 fill-orange-500',
    'text-violet-500 fill-violet-500',
    'text-rose-500 fill-rose-500',
    'text-amber-500 fill-amber-500',
    'text-cyan-500 fill-cyan-500',
    'text-pink-500 fill-pink-500',
  ];

  const handleRowClick = useCallback((row) => {
    const rowData = rows[row.index];
    if (!rowData?.id) return;
    const to = `/document/${rowData.id}`;
    searchParams.delete(to);
    searchParams.set(to, '_sidebar');
    setSearchParams(searchParams);
  }, [rows, searchParams, setSearchParams]);

  return (
    <Form {...form}>
      <form onSubmit={e => e.preventDefault()}>
        <TableFilter 
          filters={filters}
          onRemoveFilter={removeFilter}
          columns={tableColumns}
        />

        {/* Bulk actions bar */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="h-10 mb-2 flex items-center gap-2 px-2 border rounded-md">
            <span className="text-sm text-muted-foreground">
              {Object.keys(rowSelection).length} selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => duplicateRows()}>
              <CopyIcon className="h-4 w-4 mr-2" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => deleteRows()} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
            </Button>
          </div>
        )}

        {/* Scrollable table area */}
        <div className="overflow-x-auto w-full">
          {groupedRows ? (
            /* ── GROUPED VIEW ─────────────────────────────────────────── */
            <div>
              {groupedRows.map((group, groupIndex) => {
                const isCollapsed = collapsedGroups[group.value] ?? false;
                const colorClass = GROUP_COLORS[groupIndex % GROUP_COLORS.length];
                return (
                  <div key={group.value} className="mb-4">
                    {/* Group header bar */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30 cursor-pointer select-none"
                      onClick={() => toggleGroup(group.value)}
                    >
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${!isCollapsed ? 'rotate-90' : ''}`}
                      />
                      <Circle className={`h-3 w-3 ${colorClass}`} />
                      <span className="text-sm font-semibold">{group.label}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-tight">
                        {group.count}
                      </span>
                    </div>

                    {!isCollapsed && (
                      <>
                        {/* Per-group column header */}
                        <HeaderRow sensors={sensors} handleDragEnd={handleDragEnd} table={table} addFilter={addFilter} setEditPropertyModal={setEditPropertyModal} addNewColumn={addNewColumn} />
                        {/* Rows */}
                        <div className="divide-y">
                          {group.rows.map(row => <RowItem key={row.id} row={row} rows={rows} duplicateRows={duplicateRows} deleteRows={deleteRows} onRowClick={handleRowClick} />)}
                        </div>
                        <AddTaskRow />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── FLAT VIEW ────────────────────────────────────────────── */
            <>
              <HeaderRow sensors={sensors} handleDragEnd={handleDragEnd} table={table} addFilter={addFilter} setEditPropertyModal={setEditPropertyModal} addNewColumn={addNewColumn} />
              <div className="divide-y">
                {table.getRowModel().rows.map(row => (
                  <RowItem key={row.id} row={row} rows={rows} duplicateRows={duplicateRows} deleteRows={deleteRows} onRowClick={handleRowClick} />
                ))}
              </div>
              <AddTaskRow />
            </>
          )}
        </div>
      </form>

      <EditPropertyModal
        open={editPropertyModal.open}
        property={editPropertyModal.property}
        onClose={() => setEditPropertyModal({ open: false, property: null })}
        onSave={updatedProperty => {
          setTableColumns(cols => cols.map(col =>
            col.name === editPropertyModal.property.name
              ? { ...col, ...updatedProperty }
              : col
          ));
        }}
      />
    </Form>
  );
}
