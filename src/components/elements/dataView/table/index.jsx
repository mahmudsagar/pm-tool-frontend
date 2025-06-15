"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { useState, useEffect } from "react"
import { ArrowUpIcon, ArrowDownIcon, GripVertical, PlusIcon, CopyIcon } from "lucide-react"
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
import TablePropertiesMenu from "@/components/elements/dataView/TablePropertiesMenu";

import TableFilter from "@/components/elements/dataView/filter"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import EditPropertyModal from "./EditPropertyModal";

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
    <TableHead ref={setNodeRef} style={style} key={header.id}>
      <div className="h-full w-full">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full h-full">
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <div className="flex items-center gap-2">
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext()
                )}
                {{
                  asc: <ArrowUpIcon className="h-4 w-4" />,
                  desc: <ArrowDownIcon className="h-4 w-4" />,
                }[header.column.getIsSorted()] ?? null}
              </div>
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 opacity-50 hover:opacity-100" />
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => {
              console.log(header.column.columnDef);
              setEditPropertyModal({
                open: true,
                property: {
                  ...header.column.columnDef,
                  label: header.column.columnDef.header, // ensure label is set from header
                  name: header.column.columnDef.accessorKey || header.column.columnDef.id // set name from accessorKey or id
                }
              })
            }}>
              Edit property
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => addFilter(header, 'ascending')}>
              Add ascending
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addFilter(header, 'descending')}>
              Add descending
            </DropdownMenuItem>
            <DropdownMenuItem>
              Filter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );
}

export default function TableView({ data }) {
  const [sorting, setSorting] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [filters, setFilters] = useState([]);
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
      rows: rows
    }
  });

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
    return (
      <FormField
        control={form.control}
        name={`rows.${rowIndex}.${column.id}`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              {column.columnDef.type === 'select' && column.columnDef.props?.optionsData ? (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full border-0 px-4 py-2 h-auto focus:ring-0">
                    <SelectValue placeholder="Select...">
                      {column.columnDef.props.optionsData.find(opt => opt.value === field.value)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {column.columnDef.props.optionsData.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  {...field}
                  className="border-0 h-auto focus-visible:ring-0 rounded-false py-2 px-4"
                />
              )}
            </FormControl>
          </FormItem>
        )}
      />
    )
  }

  // Update columns to filter out deleted and hidden properties
  const columns = tableColumns
    .filter(column => !column.deleted && !column.hidden)
    .map((column) => ({
      id: column.name,
      accessorKey: column.name,
      header: column.label,
      type: column.type,
      props: column.props,
      cell: ({ column, row }) => renderCell(column, row.index),
      enableSorting: true,
    }));

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

  return (
    <Form {...form}>
      <form>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicateRows()}
            >
              <CopyIcon className="h-4 w-4 mr-2" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteRows()}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
            </Button>
          </div>
        )}

        {/* Table with floating menu */}
        <div className="relative flex gap-2">
          {/* Floating menu */}
          <div className="flex flex-col pt-10">
            <div className="flex flex-col gap-[1px]">
              {table.getRowModel().rows.map((row) => (
                <div key={row.id} className="flex items-center h-10 group">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                      <GripVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => duplicateRows([row.index])}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteRows([row.index])}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className={`px-2 ${!row.getIsSelected() ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
                    <Checkbox
                      checked={row.getIsSelected()}
                      onCheckedChange={(value) => row.toggleSelected(!!value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <Table className="border flex-1">
            <TableHeader>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={table.getHeaderGroups()[0].headers.map(h => h.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <TableRow>
                    {table.getHeaderGroups()[0].headers.map((header) => (
                      <DraggableColumnHeader 
                        setEditPropertyModal={setEditPropertyModal}
                        addFilter={addFilter} 
                        key={header.id} 
                        header={header} 
                      />
                    ))}
                    
                    {/* Add menu and plus button as the last column */}
                    <TableHead className="w-[120px]">
                      <div className="flex items-center justify-between px-2 py-1">
                        <button 
                          onClick={addNewColumn}
                          className="p-1 hover:bg-gray-100 rounded-sm"
                          type="button"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <TablePropertiesMenu 
                          properties={tableColumns} 
                          setProperties={setTableColumns} 
                        />
                      </div>
                    </TableHead>
                  </TableRow>
                </SortableContext>
              </DndContext>
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="divide-x">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-left p-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell className="w-[120px]"></TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="py-3 block">
                  Load More
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
