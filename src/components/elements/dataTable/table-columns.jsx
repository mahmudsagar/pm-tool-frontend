import {
  FileText,
  ArrowUpAZ,
  ChevronDown,
  ArrowDownZA,
} from 'lucide-react';
import ShowIcon from '@/components/common/ShowIcon';
import { resolveBoardListPageType } from '@/components/elements/dataView/scrum/scrumBoardConstants';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import TableColumnsShare from './components/table-columns-share';
import TableColumnsDropdown from './components/table-columns-dropdown';

// Create a function to generate columns with delete and edit handlers
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
  // {
  //   accessorKey: "icon",
  //   header: ({ column }) => {
  //     return (
  //       <div className="w-10 flex items-center justify-center">
  //         <FileText className='w-5 h-5 dark:text-white' />
  //       </div>
  //     )
  //   },
  //   cell: ({ row }) => (
  //     <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
  //       <row.original.icon className="w-5 h-5 text-purple-700" />
  //     </div>
  //   ),
  // },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
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
      );
    },
    cell: ({ row }) => {
      // Handle icon display - if type is null but page_type is set, treat as 'page'
      const fileType = row.original.type || (row.original.page_type ? 'page' : undefined);
      return (
      <div className="group flex items-center gap-8">
        <div className='flex items-center gap-3'>
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <ShowIcon
              file={fileType}
              page={row.original.page_type}
              item={row.original}
              size={20}
            />
          </div>
          <span>{row.getValue("name")}</span>
        </div>
        <div 
          className="flex items-center gap-2 transition-opacity" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Ensure clicks on action buttons don't bubble up to the row
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
        >
          {/* Pass row instead of row info to avoid undefined column ID issues */}
          <TableColumnsDropdown 
            info={row} 
            onDeleteSuccess={onDeleteSuccess}
            onEditSuccess={onEditSuccess}
          />
          {/* Share Button */}
          {/* <TableColumnsShare title={row.getValue("name") || ''} /> */}
        </div>
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
    accessorKey: "modified",
    header: ({ column }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
              Modified
              <ChevronDown className='w-4 h-4' />
            </button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      );
    },
    cell: ({ row }) => (
      <div className='text-slate-500 dark:text-white'>{row.getValue("modified")}</div>
    ),
  },
  // {
  //   accessorKey: "modifiedBy",
  //   header: ({ column }) => {
  //     return (
  //       <DropdownMenu>
  //         <DropdownMenuTrigger asChild>
  //           <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
  //             Modified By
  //             <ChevronDown className='w-4 h-4' />
  //           </button>
  //         </DropdownMenuTrigger>
  //       </DropdownMenu>
  //     );
  //   },
  //   cell: ({ row }) => (
  //     <div className='text-slate-500 dark:text-white'>{row.getValue("modifiedBy")}</div>
  //   ),
  // },

  /*
  {
    accessorKey: "modifiedBy",
    header: ({ column }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
              Modified By
              <ChevronDown className='w-4 h-4' />
            </button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      );
    },
    cell: ({ row }) => (
      <div className='text-slate-500 dark:text-white'>{row.getValue("modifiedBy")}</div>
    ),
  },
  */
  {
    accessorKey: "sharing",
    header: ({ column }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
              Sharing
              <ChevronDown className='w-4 h-4' />
            </button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      );
    },
    cell: ({ row }) => (
      <div className='text-slate-500 dark:text-white'>{row.getValue("sharing")}</div>
    ),
  },
];

// Export a default version for backward compatibility
// Use empty functions as defaults to avoid errors
export default createColumns(() => {}, () => {});