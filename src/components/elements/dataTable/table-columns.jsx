import {
  Box,
  Copy,
  Link2,
  Trash2,
  LogOut,
  FileText,
  ArrowUpAZ,
  FolderCog,
  FolderGit2,
  PaintBucket,
  ChevronDown,
  ArrowDownZA,
  ExternalLink,
  FolderOutput,
  MoreVertical,
  UserRoundPlus,
  ArrowDownToLine,
  SquareArrowOutUpRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuSub,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default [
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
        <div className="w-10 flex items-center justify-center">
          <FileText className='w-5 h-5 dark:text-white' />
        </div>
      )
    },
    cell: ({ row }) => (
      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
        <row.original.icon className="w-5 h-5 text-purple-700" />
      </div>
    ),
  },
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
    cell: ({ row }) => (
      <div className="group flex items-center gap-8">
        <span>{row.getValue("name")}</span>
        <div className="flex items-center gap-2 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100 opacity-0 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <SquareArrowOutUpRight className="w-4 h-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <Link2 className="w-4 h-4" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <FolderGit2 className="w-4 h-4" />
                  Request Files
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <FolderCog className="w-4 h-4" />
                  Manage Access
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <ArrowDownToLine className="w-4 h-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <UserRoundPlus className="w-4 h-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <FolderOutput className="w-4 h-4" />
                  Move to
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <Copy className="w-4 h-4" />
                  Copy to
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                    <PaintBucket className="w-4 h-4" />
                    Folder Color
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                        Color 1
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                        Color 2
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                        Color 3
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                  <Box className="w-4 h-4" />
                  Automate
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                      Automate 1
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                      Automate 2
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                      Automate 3
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer">
                <LogOut className="w-4 h-4" />
                Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="group-hover:opacity-100 data-[state=open]:opacity-100 opacity-0 transition-opacity">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
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
  {
    accessorKey: "fileSize",
    header: ({ column }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="font-medium dark:text-white flex items-center justify-center gap-2 bg-none border-none focus:outline-none">
              File Size
              <ChevronDown className='w-4 h-4' />
            </button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      );
    },
    cell: ({ row }) => (
      <div className='text-slate-500 dark:text-white'>{row.getValue("fileSize")}</div>
    ),
  },
  {
    accessorKey: "sharing",
    header: ({ column }) => <p className='dark:text-white'>Sharing</p>,
    cell: ({ row }) => (
      <div className='text-slate-500 dark:text-white'>{row.getValue("sharing")}</div>
    ),
  },
  {
    accessorKey: "activity",
    header: ({ column }) => <p className='dark:text-white'>Activity</p>,
    cell: ({ row }) => (
      <div className='text-slate-500 dark:text-white'>{row.getValue("activity")}</div>
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