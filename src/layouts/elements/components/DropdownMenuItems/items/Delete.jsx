import { Trash2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import useFileManagerStore from "@/stores/useFileManagerStore";
import useDialog from '@/hooks/useDialog';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';

const Delete = ({ fileId, fileType, onSuccess, wrapperClassName = "" }) => {
  const { mutate: deleteEntity } = useDeleteEntity();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { deleteHandler } = useFileManagerStore(state => state);
  const { confirm } = useDialog();

  const handleDelete = () => {
    confirm({
      title: 'Confirm Deletion',
      description: `Are you sure you want to delete this ${fileType}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: 'destructive',
      onConfirm: () =>
        new Promise((resolve, reject) => {
          if (!['page', 'folder', 'group', 'space', 'board'].includes(fileType)) {
            console.error('Invalid filetype specified for delete:', fileType);
            resolve();
            return;
          }

          deleteEntity(
            { entityId: fileId, entityType: fileType },
            {
              onSuccess: () => {
                deleteHandler(fileId, fileType);

                const isViewingDeletedItem = id === fileId || location.pathname.includes(fileId);
                if (isViewingDeletedItem) {
                  navigate('/');
                }

                if (typeof onSuccess === 'function') {
                  onSuccess(fileId, fileType);
                }
                resolve();
              },
              onError: (error) => {
                console.error("Error deleting data: ", error);
                reject(error);
              },
            }
          );
        }),
    });
  };

  return (
    <DropdownMenuItem
      className={`cursor-pointer flex items-center gap-2 ${wrapperClassName}`}
      onSelect={handleDelete}
    >
      <Trash2 className="w-4 h-4" />
      <span>Delete</span>
    </DropdownMenuItem>
  );
};

export default Delete;