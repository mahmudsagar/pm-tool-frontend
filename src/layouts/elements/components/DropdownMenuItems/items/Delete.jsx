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
import ButtonLoading from '../../ButtonLoading';
import useApi from '@/lib/dataFetcher';
import NotFound from '@/BetterRouter/NotFound';
import { baseUrl } from '@/utils/constants';

const Delete = ({ fileId, fileType, onToggle }) => {
  const { callApi, error } = useApi();
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { deleteHandler } = useFileManagerStore(state => state);

  const handleDeleteClick = (e) => {
    e.preventDefault();
    setIsDialogOpen(true);
  };

  const confirmDelete = async () => {  
    let endPoint;
    setLoading(true);

    if (fileType === "page") {
      endPoint = `/v1/page/document?id=${fileId}`;
    } else if (fileType === "folder"){
      endPoint = `/v1/folder?id=${fileId}`;
    } else if (fileType === "group"){
      endPoint = `/v1/group?id=${fileId}`;      
    } else {
      return { error: "Invalid filetype specified" };
    }   

    try {
      await callApi(baseUrl + endPoint, { method: 'DELETE', });
      deleteHandler(fileId, fileType); 
      setLoading(false); 
      setIsDialogOpen(false);
    } catch (error) {
      setLoading(false); 
      console.error("Error deleting data: ", error);
    }   
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onToggle(fileId, false);
  };

  if (error) {
    return <NotFound />
  }

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
              {loading ? <ButtonLoading text='Deleting...' flex='row' /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Delete