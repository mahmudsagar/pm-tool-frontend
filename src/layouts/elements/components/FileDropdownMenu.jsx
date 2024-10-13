import React, { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const FileDropdownMenu = ({ isOpen = {}, onToggle = () => {}, folderId }) => {
  const folderStore = useFolderStore(state => state);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const deleteItem = folderStore?.deleteItem;

  const handleDeleteClick = () => {
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteItem && folderId) {
      deleteItem('folder', folderId);
    }
    setIsDialogOpen(false); 
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onToggle(folderId, false);
  };

  return (
    <>
      <DropdownMenu open={isOpen[folderId]} onOpenChange={() => onToggle(folderId, true)}>
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
                isOpen[folderId] ? 'opacity-100' : 'opacity-100'
              )}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem className="cursor-pointer" onClick={handleDeleteClick}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this folder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileDropdownMenu;
