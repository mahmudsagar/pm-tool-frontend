import { useState, useMemo, useRef, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { sanitize } from '@/utils/helper';
import useDialog from '@/hooks/useDialog';
import NotFound from '@/BetterRouter/NotFound';
import Spinner from '@/components/elements/spinner';
import Document from './Document';
import Sheet from './Sheets';
import Whiteboard from './Whiteboard';
import { useDocument } from '@/hooks/queries/useFilesQueries';
import { useUpdateDocument, useDeleteDocument } from '@/hooks/mutations/useFilesMutations';
import HistoryPanel from '@/components/elements/HistoryPanel';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers } from '@/hooks/queries/useSpacesQueries';
import { useTeams } from '@/hooks/queries/useTeamsQueries';
import useFileManagerStore from '@/stores/useFileManagerStore';

const pageType = {
  document: Document,
  sheet: Sheet,
  whiteboard: Whiteboard,
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
  const { deleteHandler } = useFileManagerStore(state => state);

  // Use TanStack Query to fetch document data
  const { data, isLoading, error } = useDocument(paramId);
  const updateDocumentMutation = useUpdateDocument();
  const deleteDocumentMutation = useDeleteDocument();

  const { page_type, ...restData } = data || {}
  const saveDebounceRef = useRef(null);

  // Compute live assignee options for board documents so DynamicInput
  // can render the 'dynamic-select' assignee field with the correct users.
  const { data: allUsers } = useUsers();
  const { data: allTeams } = useTeams();
  const assigneeOptions = useMemo(() => {
    const usersArray = Array.isArray(allUsers) ? allUsers : [];
    if (!usersArray.length || !data?.board_id) return [];

    if (data?.is_private) {
      return usersArray
        .filter(u => u._id === data?.user_id)
        .map(u => ({ label: u.name || u.email, value: u._id }));
    }

    const hasSharedMembers = (data?.shared_members?.length ?? 0) > 0;
    const hasSharedTeams = (data?.shared_teams?.length ?? 0) > 0;

    if (!hasSharedMembers && !hasSharedTeams) {
      return usersArray.map(u => ({ label: u.name || u.email, value: u._id }));
    }

    const allowedIds = new Set(data?.shared_members || []);
    const teamsArray = Array.isArray(allTeams) ? allTeams : [];
    for (const teamId of (data?.shared_teams || [])) {
      const team = teamsArray.find(t => t._id === teamId);
      if (team?.shared_members) team.shared_members.forEach(id => allowedIds.add(id));
    }
    return usersArray
      .filter(u => allowedIds.has(u._id))
      .map(u => ({ label: u.name || u.email, value: u._id }));
  }, [data, allUsers, allTeams]);

  const handleDelete = async () => {
    try {
      await deleteDocumentMutation.mutateAsync(paramId);
      // Remove cached query data so it's not refetched after unmount
      queryClient.removeQueries({ queryKey: ['documents', paramId] });
      // Update the Zustand sidebar store so the deleted item disappears immediately
      deleteHandler(paramId, 'page');

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
    const documentId = data?._id;
    if (!documentId) return;
    const sanitized = sanitize(value);

    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(() => {
      updateDocumentMutation.mutate({
        documentId,
        content: sanitized,
        boardId: data?.board_id,
      });
    }, 500);
  }

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, []);

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
    assigneeOptions,
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