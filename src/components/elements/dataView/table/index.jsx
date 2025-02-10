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
import { ArrowUpIcon, ArrowDownIcon, GripVertical, PlusIcon } from "lucide-react"
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

// Add this new component for sortable column headers
function DraggableColumnHeader({ header }) {
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
            <DropdownMenuItem>
              Edit property
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => header.column.toggleSorting(false)}>
              Sort Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => header.column.toggleSorting(true)}>
              Sort Descending
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
  // Add state for sorting
  const [sorting, setSorting] = useState([]);
  // Add state for column order
  const [columnOrder, setColumnOrder] = useState([]);
  // Add state for managing columns with additional properties for visibility and deletion
  const [tableColumns, setTableColumns] = useState(
    data.property_name.map(col => ({
      ...col,
      deleted: false,
      hidden: false
    }))
  );

  const form = useForm({
    defaultValues: {
      rows: data.property_values
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

  // In the TableView component, update the columns definition:
  
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
    data: data.property_values,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      columnOrder, // Add column order to state
    },
    onColumnOrderChange: setColumnOrder, // Add column order change handler
  });

  return (
    <Form {...form}>
      <form>
        <Table className="border">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                key={headerGroup.id}
              >
                <SortableContext 
                  items={headerGroup.headers.map(h => h.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <TableRow>
                    {headerGroup.headers.map((header) => (
                      <DraggableColumnHeader key={header.id} header={header} />
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
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="divide-x">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-left p-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                {/* Add empty cell to match the header */}
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
      </form>
    </Form>
  );
}