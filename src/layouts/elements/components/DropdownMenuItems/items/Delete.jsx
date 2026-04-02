import { Trash2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import useFileManagerStore from "@/stores/useFileManagerStore";
import useDialog from '@/hooks/useDialog';
import { useDeleteEntity } from '@/hooks/mutations/useDeleteMutations';

const Delete = ({ fileId, fileType, onSuccess, wrapperClassName = "" }) => {
  const { mutateAsync: deleteEntity } = useDeleteEntity();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { deleteHandler } = useFileManagerStore(state => state);
  const { confirm } = useDialog();

  const handleDelete = () => {
    // Defer so the dropdown finishes closing before AlertDialog opens,
    // preventing the aria-hidden conflict on the still-focused dropdown content.
    setTimeout(() => {
      // Blur any focused element (e.g. the trigger button that Radix returns focus to
      // after dropdown closes) before the dialog opens. When AlertDialog opens it
      // marks #root as aria-hidden; if the trigger still has focus inside #root
      // the browser fires the aria-hidden warning.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      confirm({
        title: 'Confirm Deletion',
        description: `Are you sure you want to delete this ${fileType}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        confirmVariant: 'destructive',
        onConfirm: async () => {
          if (!['page', 'folder', 'group', 'space', 'board'].includes(fileType)) {
            console.error('Invalid filetype specified for delete:', fileType);
            return;
          }

          // mutateAsync returns a real Promise — resolves/rejects regardless of
          // whether the Delete component is still mounted (unlike per-call callbacks on mutate).
          await deleteEntity({ entityId: fileId, entityType: fileType });

          try {
            deleteHandler(fileId, fileType);

            const isViewingDeletedItem = id === fileId || location.pathname.includes(fileId);
            if (isViewingDeletedItem) {
              navigate('/');
            }

            if (typeof onSuccess === 'function') {
              onSuccess(fileId, fileType);
            }
          } catch (e) {
            console.error('Post-delete error:', e);
          }
        },
      });
    }, 150);
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