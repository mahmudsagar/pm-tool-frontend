import React, { useState, useCallback, useEffect } from 'react'
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
  SquarePen,
  Check,
  Pin,
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
import Delete from '@/layouts/elements/components/DropdownMenuItems/items/Delete';
import AddFileDialog from '@/layouts/elements/components/AddFileDialog';
import { useToast } from '@/components/ui/use-toast';
import useFileManagerStore from '@/stores/useFileManagerStore';

const TableColumnsDropdown = ({info, onDeleteSuccess, onEditSuccess}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const { toast } = useToast();
  const { togglePinStatus } = useFileManagerStore();
  
  // Extract file information from row data
  // Add safety checks to avoid undefined errors
  const fileId = info?.original?.id || '';
  const fileType = info?.original?.type || 'folder'; // Default to folder if not specified
  const fileName = info?.original?.name || '';
  
  // Get pin status when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Check if this item is pinned in the original data
      const pinned = info?.original?.pinned || false;
      setIsPinned(pinned);
    }
  }, [isOpen, info]);
  
  // Toggle function for the dropdown
  const handleToggle = (id, isVisible) => {
    setIsOpen(isVisible);
  };

  // Prevent event propagation to parent link
  const handleDropdownClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle edit button click
  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditModalOpen(true);
    setIsOpen(false); // Close dropdown when opening edit modal
  };

  // Handle link copy
  const handleCopyLink = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create appropriate link based on file type
    const baseUrl = window.location.origin;
    let fileLink = '';
    
    if (fileType === 'folder' || fileType === 'group') {
      fileLink = `${baseUrl}/file-manager/${fileType}/${fileId}`;
    } else {
      fileLink = `${baseUrl}/document/${fileId}`;
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
        setIsOpen(false);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        toast({
          variant: "destructive",
          title: "Copy failed",
          description: "Could not copy link to clipboard",
        });
      });
  }, [fileId, fileType, toast]);

  // Handle pin toggle with optimistic UI update
  const handlePinToggle = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setPinLoading(true);
    const newPinStatus = !isPinned;
    
    // Optimistically update UI
    setIsPinned(newPinStatus);
    
    try {
      const result = await togglePinStatus(fileId, fileType, newPinStatus);
      
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
      setIsOpen(false);
    }
  }, [fileId, fileType, fileName, isPinned, togglePinStatus, toast]);

  // Enhanced success handler with additional error catching
  const handleDeleteSuccess = useCallback(() => {
    console.log("Delete operation successful for item:", fileId);
    
    // Close the dropdown first
    setIsOpen(false);
    
    // Add a small delay to ensure UI updates properly
    setTimeout(() => {
      // Call parent callback if provided to remove item from table
      if (typeof onDeleteSuccess === 'function') {
        try {
          onDeleteSuccess(fileId, fileType);
        } catch (error) {
          console.error("Error in delete success callback:", error);
        }
      }
    }, 10);
  }, [fileId, fileType, onDeleteSuccess]);

  // Handle successful edit operation
  const handleEditSuccess = useCallback((updatedItem) => {
    console.log("Edit operation successful for item:", fileId);
    
    // Close the dropdown first
    setIsOpen(false);
    
    // Update the item in the table
    if (typeof onEditSuccess === 'function') {
      try {
        onEditSuccess(fileId, fileType, updatedItem);
      } catch (error) {
        console.error("Error in edit success callback:", error);
      }
    } else if (typeof onDeleteSuccess === 'function') {
      try {
        // Fallback to reuse the same callback to refresh the UI
        onDeleteSuccess(fileId, fileType, true);
      } catch (error) {
        console.error("Error in edit success callback:", error);
      }
    }
  }, [fileId, fileType, onEditSuccess, onDeleteSuccess]);
  
  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Ensure clicks on the trigger don't bubble up to the row
          if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
          }
        }}>
          <button className="focus:outline-none group-hover:opacity-100 data-[state=open]:opacity-100 opacity-0 transition-opacity">
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Ensure clicks in the dropdown don't bubble up to the row
          if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation();
          }
        }}>
          <DropdownMenuGroup>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleEditClick}>
              <SquarePen className="w-4 h-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" onSelect={handleCopyLink}>
              <Link2 className="w-4 h-4" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center px-4 py-3 font-medium gap-3 cursor-pointer" 
              onSelect={handlePinToggle}
              disabled={pinLoading}
            >
              <Pin className="w-4 h-4" />
              {isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <Delete 
              fileId={fileId} 
              fileType={fileType} 
              onToggle={handleToggle}
              onSuccess={handleDeleteSuccess}
              wrapperClassName="px-4 py-3 font-medium" // Pass custom classes to override defaults
            />
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <AddFileDialog 
          id={fileId} 
          type={fileType} 
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

export default TableColumnsDropdown;