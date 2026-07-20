import {
  ArrowUpAZ,
  ChevronDown,
  ArrowDownZA,
} from 'lucide-react';
import ShowIcon from '@/components/common/ShowIcon';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import TableColumnsDropdown from './components/table-columns-dropdown';

export const createColumns = (onDeleteSuccess, onEditSuccess) => [
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
    accessorKey: "name",
    header: ({ column }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
            Name
            <ChevronDown className='w-4 h-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.toggleSorting(true)}>
            <ArrowDownZA className='w-4 h-4' />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.toggleSorting(false)}>
            <ArrowUpAZ className='w-4 h-4' />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    cell: ({ row }) => {
      const fileType = row.original.type || (row.original.page_type ? 'page' : undefined);
      return (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <ShowIcon
              file={fileType}
              page={row.original.page_type}
              item={row.original}
              size={20}
            />
          </div>
          <span className="truncate">{row.getValue("name")}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "typeLabel",
    header: () => (
      <span className="font-medium dark:text-white">Type</span>
    ),
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-white capitalize">
        {row.getValue("typeLabel")}
      </div>
    ),
  },
  {
    accessorKey: "spaceName",
    header: () => (
      <span className="font-medium dark:text-white">Space</span>
    ),
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-white">
        {row.getValue("spaceName") || '—'}
      </div>
    ),
  },
  {
    accessorKey: "modified",
    header: ({ column }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
            Modified
            <ChevronDown className='w-4 h-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.toggleSorting(true)}>
            <ArrowDownZA className='w-4 h-4' />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.toggleSorting(false)}>
            <ArrowUpAZ className='w-4 h-4' />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-white">{row.getValue("modified")}</div>
    ),
  },
  {
    accessorKey: "sharing",
    header: ({ column }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
            Sharing
            <ChevronDown className='w-4 h-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.setFilterValue("Public")}>
            Public
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.setFilterValue("Private")}>
            Private
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => column.setFilterValue(undefined)}>
            All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    cell: ({ row }) => (
      <div className="text-slate-500 dark:text-white">{row.getValue("sharing")}</div>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div
        className="flex justify-end"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
          }
        }}
      >
        <TableColumnsDropdown
          info={row}
          onDeleteSuccess={onDeleteSuccess}
          onEditSuccess={onEditSuccess}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export default createColumns(() => {}, () => {});
