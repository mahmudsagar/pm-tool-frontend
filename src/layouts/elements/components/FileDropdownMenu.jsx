import React from 'react'
import { cn } from "@/lib/utils";
import useFolderStore from "@/stores/folderStore";
import { Button } from "@/components/ui/button";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const FileDropdownMenu = ({ isOpen, onToggle, folderId }) => {
  const { deleteItem } = useFolderStore(state => state);

  return (
    <DropdownMenu open={isOpen[folderId]} onOpenChange={() => onToggle(folderId)}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6" onClick={(e) => e.stopPropagation()}>
          <EllipsisVertical
            size={16}
            className={cn(
              'text-slate-500 hover:text-black dark:text-white dark:hover:text-black',
              isOpen[folderId] ? 'opacity-100' : 'opacity-100'
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} >
        <DropdownMenuItem className="cursor-pointer" onClick={() => deleteItem('folder', folderId)} >Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default FileDropdownMenu