import { Trash2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import useFileManagerStore from "@/stores/useFileManagerStore";
import ButtonLoading from '../../ButtonLoading';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';

// Menu item rendered inside DropdownMenuContent
const DeleteMenuItem = ({ onClick, wrapperClassName = "" }) => {
  return (
    <DropdownMenuItem
      className={`cursor-pointer flex items-center gap-2 ${wrapperClassName}`}
      onSelect={onClick}
    >
      <Trash2 className="w-4 h-4" />
      <span>Delete</span>
    </DropdownMenuItem>
  );
};

// Confirmation dialog rendered OUTSIDE the DropdownMenu to avoid aria-hidden conflicts
const DeleteConfirmDialog = ({ fileId, fileType, open, onOpenChange, onSuccess }) => {
  const { mutate: deleteEntity, isPending } = useDeleteEntity();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { deleteHandler } = useFileManagerStore(state => state);

  const confirmDelete = () => {
    if (!['page', 'folder', 'group', 'space', 'board'].includes(fileType)) {
      console.error('Invalid filetype specified for delete:', fileType);
      return;
    }

    deleteEntity(
      { entityId: fileId, entityType: fileType },
      {
        onSuccess: () => {
          deleteHandler(fileId, fileType);
          onOpenChange(false);

          const isViewingDeletedItem = id === fileId || location.pathname.includes(fileId);
          if (isViewingDeletedItem) {
            navigate('/');
          }

          if (typeof onSuccess === 'function') {
            onSuccess(fileId, fileType);
          }
        },
        onError: (error) => {
          console.error("Error deleting data: ", error);
        }
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {fileType}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
            {isPending ? <ButtonLoading text='Deleting...' flex='row' /> : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { DeleteMenuItem, DeleteConfirmDialog };
export default DeleteMenuItem;