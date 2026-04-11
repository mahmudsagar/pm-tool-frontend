import { useState } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { sanitize } from '@/utils/helper';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import NotFound from '@/BetterRouter/NotFound';
import Spinner from '@/components/elements/spinner';
import Document from './Document';
import Sheet from './Sheets';
import Whiteboard from './Whiteboard';
import Board from './Board';
import { useDocument } from '@/hooks/queries/useFilesQueries';
import { useUpdateDocument, useDeleteDocument } from '@/hooks/mutations/useFilesMutations';
import HistoryPanel from '@/components/elements/HistoryPanel';

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
  const paramId = props.id || id;
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Use TanStack Query to fetch document data
  const { data, isLoading, error } = useDocument(paramId);
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const { page_type, ...restData } = data || {}

  const handleDelete = async () => {
    try {
      await deleteDocumentMutation.mutateAsync(paramId);
      navigate('/'); // Navigate to home after successful deletion
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  }

  const handleSubmit = (value) => {
    updateDocumentMutation.mutate({
      documentId: data?._id,
      content: sanitize(value),
    });
  }

  if (error) {
    return <NotFound />
  }

  const componentProps = {
    ...restData,
    setTopMenu,
    setOpenDeleteDialog,
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

    <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure to proceed?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this
            document.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}

export default Page;