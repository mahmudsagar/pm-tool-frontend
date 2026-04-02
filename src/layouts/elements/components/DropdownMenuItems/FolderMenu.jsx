import React, { useCallback, useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EllipsisVertical, Link2, Pin, SquarePen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Delete from './items/Delete';
import useFileManagerStore from '@/stores/useFileManagerStore';
import { useToast } from '@/components/ui/use-toast';
import AddFileDialog from '../AddFileDialog';

const FolderMenu = ({ isOpen = {}, onToggle = () => { }, id, type, fileName }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [pinLoading, setPinLoading] = useState(false);
    const { toast } = useToast();
    const { togglePinStatus } = useFileManagerStore();
  // Handle edit button click
    const handleEditClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsEditModalOpen(true);
      onToggle(id, false); // Close dropdown when opening edit modal
    };
  
    // Handle link copy
    const handleCopyLink = useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Create appropriate link based on file type
      const baseUrl = window.location.origin;
      let fileLink = '';
      
      if (type === 'folder' || type === 'group') {
        fileLink = `${baseUrl}/file-manager/${type}/${id}`;
      } else {
        fileLink = `${baseUrl}/document/${id}`;
      }
      
      // Copy to clipboard
      navigator.clipboard.writeText(fileLink)
        .then(() => {
          // Show success toast
          toast({
            variant: "success",
            title: "Link copied!",
            description: "File link has been copied to clipboard",
          });
          
          // Close dropdown
          onToggle(id, false);
        })
        .catch(err => {
          console.error('Failed to copy link: ', err);
          toast({
            variant: "destructive",
            title: "Copy failed",
            description: "Could not copy link to clipboard",
          });
        });
    }, [id, type, toast]);
  
  // Handle pin toggle with optimistic UI update
  const handlePinToggle = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setPinLoading(true);
    const newPinStatus = !isPinned;
    
    // Optimistically update UI
    setIsPinned(newPinStatus);
    
    try {
      const result = await togglePinStatus(id, type, newPinStatus);
      
      if (result.error) {
        // Revert optimistic update if there was an error
        setIsPinned(!newPinStatus);
        toast({
          variant: "destructive",
          title: "Error updating pin status",
          description: result.error,
        });
      } else {
        toast({
          variant: "success",
          title: newPinStatus ? "Item pinned" : "Item unpinned",
          description: `${fileName} has been ${newPinStatus ? "pinned to sidebar" : "unpinned"}.`,
        });
      }
    } catch (error) {
      // Revert optimistic update if there was an error
      setIsPinned(!newPinStatus);
      toast({
        variant: "destructive",
        title: "Error updating pin status",
        description: error.message,
      });
    } finally {
      setPinLoading(false);
      onToggle(id, false);
    }
  }, [id, type, fileName, isPinned, togglePinStatus, toast]);

  // Handle successful edit operation
  const handleEditSuccess = useCallback((updatedItem) => {
    // Update the item in the table
    try {
      onEditSuccess(id, type, updatedItem);
    } catch (error) {
      console.error("Error in edit success callback:", error);
    }
    try {
      // Fallback to reuse the same callback to refresh the UI
      // onDeleteSuccess(id, type, true);
    } catch (error) {
      console.error("Error in edit success callback:", error);
    }
  }, [id, type]);
  // Enhanced success handler with additional error catching
    const handleDeleteSuccess = useCallback(() => {      
      // Add a small delay to ensure UI updates properly
      setTimeout(() => {
        // Call parent callback if provided to remove item from table
        try {
          onDeleteSuccess(id, type);
        } catch (error) {
          console.error("Error in delete success callback:", error);
        }
      }, 10);
    }, [id, type]);
  return (
    <>
      <DropdownMenu open={!!isOpen[id]} onOpenChange={() => onToggle(id)}>
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
        <DropdownMenuGroup>
          <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleEditClick}>
            <SquarePen className="w-4 h-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleCopyLink}>
            <Link2 className="w-4 h-4" />
            Copy Link
          </DropdownMenuItem>
          {/* <DropdownMenuItem 
            className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" 
            onSelect={handlePinToggle}
            disabled={pinLoading}
          >
            <Pin className="w-4 h-4" />
            {isPinned ? "Unpin" : "Pin"}
          </DropdownMenuItem> */}
        </DropdownMenuGroup>
          <Delete
            fileId={id}
            fileType={type}
            onSuccess={handleDeleteSuccess}
            wrapperClassName="px-4 py-3 font-medium" 
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Edit Modal */}
      {isEditModalOpen && (
        <AddFileDialog
          id={id}
          type={type}
          isEdit={true}
          initialName={fileName}
          isOpen={isEditModalOpen}
          setIsOpen={setIsEditModalOpen}
          onEditSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}

export default FolderMenu