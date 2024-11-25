import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Delete from './items/Delete';

const FolderMenu = ({ isOpen = {}, onToggle = () => {}, id, type }) => {
  return (
    <>
      <DropdownMenu open={isOpen[id]} onOpenChange={() => onToggle(id, true)}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-slate-300 w-6 h-6"
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            <EllipsisVertical
              size={16}
              className={cn(
                'text-slate-500 hover:text-black dark:text-white dark:hover:text-black',
                isOpen[id] ? 'opacity-100' : 'opacity-100'
              )}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <Delete
            fileId={id}
            fileType={type}
            onToggle={onToggle}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

export default FolderMenu