import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ItemDelete = ({ onDelete, folderId, loading, onToggle, isOpen }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (onDelete && folderId) {
      onDelete(folderId);
      if (!loading) {
        setIsDialogOpen(false);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onToggle(folderId, false);
  };

  return (
    <>
      <DropdownMenuItem
        className="cursor-pointer flex items-center gap-2"
        onClick={handleDeleteClick}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </DropdownMenuItem>

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
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ItemDelete;