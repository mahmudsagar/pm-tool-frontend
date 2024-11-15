import React, { useState } from 'react';
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import useFileManagerStore from "@/stores/useFileManagerStore";
import MenuItemLoading from '../../MenuItemLoading';

const Delete = ({ fileId, fileType, onToggle }) => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { removeData } = useFileManagerStore(state => state);

  const handleDeleteClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {
    setLoading(true);

    try {
      await removeData(fileId, fileType);
      setLoading(false)
      setIsDialogOpen(false);
    } catch (error) {
      setLoading(false)
      console.error("Error fetching data: ", error);
    }    
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onToggle(fileId, false);
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
              {loading ? <MenuItemLoading text='Deleting...' flex='row' /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Delete