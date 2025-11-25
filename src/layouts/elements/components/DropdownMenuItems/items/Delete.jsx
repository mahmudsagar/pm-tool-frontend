import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';

const Delete = ({ fileId, fileType, onToggle, onSuccess, wrapperClassName = "" }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { mutate: deleteEntity, isPending } = useDeleteEntity();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const { deleteHandler, syncSpacesFromAPI } = useFileManagerStore(state => ({
    deleteHandler: state.deleteHandler,
    syncSpacesFromAPI: state.syncSpacesFromAPI
  }));

  // Cleanup: always remove inert when component unmounts
  useEffect(() => {
    return () => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.removeAttribute('inert');
      }
    };
  }, []);

  const confirmDelete = () => {
    // Validate entity type
    if (!['page', 'folder', 'group', 'space', 'board'].includes(fileType)) {
      console.error('Invalid filetype specified for delete:', fileType);
      return;
    }

    // Use TanStack Query mutation for delete
    deleteEntity(
      { entityId: fileId, entityType: fileType },
      {
        onSuccess: async () => {
          console.log('Delete success, fileId:', fileId, 'fileType:', fileType);
          
          // Update the local store immediately
          deleteHandler(fileId, fileType);
          
          // Refresh sidebar from API to ensure deleted item is removed
          const userId = localStorage.getItem('userId');
          console.log('Syncing spaces for userId:', userId);
          
          if (userId) {
            try {
              const result = await syncSpacesFromAPI(userId);
              console.log('Sync result:', result);
            } catch (error) {
              console.error('Error syncing spaces:', error);
            }
          }
          
          // Small delay to ensure state updates propagate
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Close dialog
          setIsDialogOpen(false);
          
          // Check if we're currently viewing the deleted item
          const isViewingDeletedItem = id === fileId || location.pathname.includes(fileId);
          
          // Navigate to root if we're viewing the deleted item
          if (isViewingDeletedItem) {
            navigate('/');
          }
          
          // Call the success callback if provided
          if (typeof onSuccess === 'function') {
            onSuccess(fileId, fileType);
          }
        },
        onError: (error) => {
          console.error("Error deleting data: ", error);
          // Dialog stays open on error so user can retry or close manually
        }
      }
    );
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    onToggle(fileId, false);
    
    // Ensure inert is removed
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.removeAttribute('inert');
    }
  };

  return (
    <>
      <DropdownMenuItem
        className={`cursor-pointer flex items-center gap-2 ${wrapperClassName}`}
        onSelect={(e) => {
          e.preventDefault();
          // DropdownMenu will close automatically, then open our dialog
          setTimeout(() => {
            setIsDialogOpen(true);
            // Ensure inert is removed after dropdown closes
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
              mainContent.removeAttribute('inert');
            }
          }, 100);
        }}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </DropdownMenuItem>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {fileType}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? <ButtonLoading text='Deleting...' flex='row' /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Delete