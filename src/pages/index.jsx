import { useState } from 'react';
import { useOutletContext, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { sanitize } from '@/utils/helper';
import useDialog from '@/hooks/useDialog';
import NotFound from '@/BetterRouter/NotFound';
import Spinner from '@/components/elements/spinner';
import Document from './Document';
import Sheet from './Sheets';
import Whiteboard from './Whiteboard';
import Board from './Board';
import { useDocument } from '@/hooks/queries/useFilesQueries';
import { useUpdateDocument, useDeleteDocument } from '@/hooks/mutations/useFilesMutations';
import HistoryPanel from '@/components/elements/HistoryPanel';
import { useQueryClient } from '@tanstack/react-query';

const pageType = {
  document: Document,
  sheet: Sheet,
  whiteboard: Whiteboard,
  board: Board
}
const Page = ({ ...props }) => {
  const context = useOutletContext();
  const [, setTopMenu] = context || ['', (props.setTopMenu ? props.setTopMenu : () => { })];
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const paramId = props.id || id;
  // If props.id is set, this page is rendered inside a sidebar/parallel route
  const isInSidebar = !!props.id;
  const [historyOpen, setHistoryOpen] = useState(false);
  const { confirm } = useDialog();

  // Use TanStack Query to fetch document data
  const { data, isLoading, error } = useDocument(paramId);
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const { page_type, ...restData } = data || {}

  const handleDelete = async () => {
    try {
      await deleteDocumentMutation.mutateAsync(paramId);
      // Remove cached query data so it's not refetched after unmount
      queryClient.removeQueries({ queryKey: ['documents', paramId] });

      if (isInSidebar) {
        // Close just the sidebar by removing its search param
        // Find the search param that corresponds to this document's path
        setTimeout(() => {
          const newParams = new URLSearchParams(searchParams);
          for (const [key, value] of newParams.entries()) {
            if (key.includes(paramId) && ['_sidebar', '_popup'].includes(value)) {
              newParams.delete(key);
              break;
            }
          }
          setSearchParams(newParams, { replace: true });
        }, 200);
      } else {
        // Full-page mode: navigate home after exit animation
        setTimeout(() => navigate('/'), 200);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }

  const handleSubmit = (value) => {
    updateDocumentMutation.mutate({
      documentId: data?._id,
      content: sanitize(value),
      boardId: data?.board_id,
    });
  }

  if (error) {
    return <NotFound />
  }

  const openDeleteDialog = () => {
    confirm({
      title: 'Confirm Deletion',
      description: 'This action cannot be undone. This will permanently delete this document.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      confirmVariant: 'destructive',
      onConfirm: handleDelete,
    });
  };

  const componentProps = {
    ...restData,
    setTopMenu,
    setOpenDeleteDialog: openDeleteDialog,
    handleSubmit,
    onOpenHistory: () => setHistoryOpen(true),
  }


  const Component = pageType[page_type] || NotFound;
  return <div className='relative h-full'>
    {(isLoading || (!data && !error)) ?
      <Spinner />
      :
      data && <Component {...componentProps} />
    }

    {paramId && page_type !== 'board' && (
      <HistoryPanel pageId={paramId} open={historyOpen} onOpenChange={setHistoryOpen} />
    )}

  </div>
}

export default Page;