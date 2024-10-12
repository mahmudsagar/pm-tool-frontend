import React from 'react'
import { 
  Box, 
  Copy, 
  Link2, 
  LogOut, 
  Trash2, 
  FolderCog, 
  FolderGit2, 
  PaintBucket, 
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
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuSubTrigger, 
  DropdownMenuSubContent,
  DropdownMenuSeparator, 
} from '@/components/ui/dropdown-menu';

const TableColumnsDropdown = () => {
  return (
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
  )
}

export default TableColumnsDropdown;