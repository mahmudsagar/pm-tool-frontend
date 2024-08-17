"use client"
import React, { useState } from 'react'
import {
  ChevronDown,
  ArrowDownWideNarrow,
  AlignLeft,
  LogOut,
  ArrowUpAZ,
  ArrowDownZA,
  CircleX,
  FileText
} from 'lucide-react';
import {
  flexRender,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const data = [
  {
    id: "m5gr84i1",
    icon: "Icon",
    name: "App inspiration.png",
    modified: "about a min ago",
    modifiedBy: "Ralph Edwards",
    fileSize: "200 KB",
    sharing: "Private",
    activity: "Olivia Rhye",
  },
  {
    id: "m5gr84i2",
    icon: "Icon",
    name: "Tech requirements.pdf",
    modified: "Jan 4, 2022",
    modifiedBy: "Eleanor Pena",
    fileSize: "720 KB",
    sharing: "Private",
    activity: "Phoenix Baker",
  },
  {
    id: "m5gr84i3",
    icon: "Icon",
    name: "Dashboard screenshot.jpg",
    modified: "Jan 2, 2022",
    modifiedBy: "Cody Fisher",
    fileSize: "16 MB",
    sharing: "Private",
    activity: "Lana Steiner",
  },
  {
    id: "m5gr84i4",
    icon: "Icon",
    name: "Dashboard prototype recording.mp4",
    modified: "about a min ago",
    modifiedBy: "Bessie Cooper",
    fileSize: "4.2 MB",
    sharing: "Private",
    activity: "Demi Wilkinson",
  },
  {
    id: "m5gr84i5",
    icon: "Icon",
    name: "Dashboard prototype FINAL.fig",
    modified: "Jan 8, 2022",
    modifiedBy: "Leslie Alexander",
    fileSize: "400 KB",
    sharing: "Private",
    activity: "Candice Wu",
  },
  {
    id: "m5gr84i6",
    icon: "Icon",
    name: "UX Design Guidelines.docx",
    modified: "Jan 6, 2022",
    modifiedBy: "Jane Cooper",
    fileSize: "12 MB",
    sharing: "Private",
    activity: "Natali Craig",
  },
  {
    id: "m5gr84i7",
    icon: "Icon",
    name: "Dashboard interaction.framerx",
    modified: "Jan 4, 2022",
    modifiedBy: "Savannah Nguyen",
    fileSize: "800 KB",
    sharing: "Private",
    activity: "Drew Cano",
  },
]

export const columns = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "icon",
    header: ({ column }) => {
      return (
        <FileText className='w-5 h-5' />
      )
    },
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("icon")}</div>
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "modified",
    header: "Modified",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("modified")}</div>
    ),
  },
  {
    accessorKey: "modifiedBy",
    header: "Modified By",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("modifiedBy")}</div>
    ),
  },
  {
    accessorKey: "fileSize",
    header: "File Size",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("fileSize")}</div>
    ),
  },
  {
    accessorKey: "sharing",
    header: "Sharing",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("sharing")}</div>
    ),
  },
  {
    accessorKey: "activity",
    header: "Activity",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("activity")}</div>
    ),
  },
  // {
  //   accessorKey: "email",
  //   header: ({ column }) => {
  //     return (
  //       <Button
  //         variant="ghost"
  //         onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  //       >
  //         Email
  //       </Button>
  //     )
  //   },
  //   cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  // },
];

const FileManager = () => {
  const [sorting, setSorting] = useState([])
  const [columnFilters, setColumnFilters] = useState([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <section className="w-full py-9 px-6 font-inter">
      <div className="flex items-center justify-between pb-6">
        <h3 className='text-xl font-medium'>My files</h3>
        <div className='menu-buttons flex items-center gap-8'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="font-medium flex items-center justify-center text-base gap-2 focus:outline-none">
                <ArrowDownWideNarrow className='w-4 h-4' />
                Sort
                <ChevronDown className='w-4 h-4' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("name").toggleSorting(true)}>
                <ArrowUpAZ className='w-4 h-4' />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("name").toggleSorting(false)}>
                <ArrowDownZA className='w-4 h-4' />
                Desc
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => setSorting([])}>
                <CircleX className='w-4 h-4' />
                Unsorted
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center text-base gap-2 focus:outline-none">
                <AlignLeft className='w-5 h-5' />
                <ChevronDown className='w-4 h-4' />
              </button>
            </DropdownMenuTrigger>
          </DropdownMenu>
          <button variant="ghost" className="flex items-center justify-center text-base gap-2 focus:outline-none">
            <LogOut className='w-4 h-4' />
            Details
          </button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) Selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  )
}

export default FileManager;