"use client"
import { useState, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useFolderContents, useGroupContents, useSpaceContents } from '@/hooks/queries/useFilesQueries';
import { useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { createColumns } from './table-columns';
import DataTableColumnBody from './data-table-body';
import DataTableColumnHeader from './data-table-header';
import { Folder, File } from 'lucide-react';
import {
  formatEntityDisplayName,
  formatEntityTypeLabel,
  getEntityRawName,
  resolveEntityPageType,
  buildSpaceNameMap,
  resolveSpaceName,
} from '@/utils/fileDisplayUtils';
import useFileManagerStore from '@/stores/useFileManagerStore';

function DataTable({ propId, propType } = {}) {
  let { id: paramId, type: paramType } = useParams();
  const location = useLocation();
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const queryClient = useQueryClient();

  // Props passed from parallel route take priority over URL params
  const id = propId || paramId;
  const type = propType || paramType;

  // Detect type from URL path if not provided as param
  const detectedType = useMemo(() => {
    if (type) return type;
    
    const path = location.pathname;
    if (path.startsWith('/folder/')) return 'folder';
    if (path.startsWith('/group/')) return 'group';
    if (path.startsWith('/space/')) return 'space';
    return null;
  }, [type, location.pathname]);

  // Use appropriate query hook based on type
  const folderQuery = useFolderContents(detectedType === 'folder' ? id : null);
  const groupQuery = useGroupContents(detectedType === 'group' ? id : null);
  const spaceQuery = useSpaceContents(detectedType === 'space' ? id : null);

  // Select the appropriate query result
  const currentQuery = detectedType === 'folder' ? folderQuery : 
                       detectedType === 'group' ? groupQuery : 
                       detectedType === 'space' ? spaceQuery : 
                       { data: null, isLoading: false };

  const { data: rawData, isLoading: loading } = currentQuery;

  // Extract the container name (folder/group/space name)
  const containerName = useMemo(() => {
    if (!rawData || !rawData[0]) return 'My Files';
    return rawData[0].name || rawData[0].title || 'My Files';
  }, [rawData]);

  const { publicSpaces, privateSpaces } = useFileManagerStore(state => ({
    publicSpaces: state.publicSpaces,
    privateSpaces: state.privateSpaces,
  }));

  const spaceNameMap = useMemo(
    () => buildSpaceNameMap([...(publicSpaces || []), ...(privateSpaces || [])]),
    [publicSpaces, privateSpaces]
  );

  // Transform data for table display
  const tableData = useMemo(() => {
    if (!rawData || !rawData[0]?.childs) return [];

    const containerSpaceName = rawData[0].name || rawData[0].title || '';

    return rawData[0].childs.map((child) => {
      const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
      };
      const pageType = resolveEntityPageType(child);

      return {
        id: child._id,
        type: child.entity_type,
        page_type: pageType,
        icon: child.entity_type === 'folder' ? Folder : File,
        name: formatEntityDisplayName(child),
        rawName: getEntityRawName(child),
        typeLabel: formatEntityTypeLabel(child),
        spaceName: resolveSpaceName(
          child.space_id || (detectedType === 'space' ? rawData[0]._id : null),
          spaceNameMap,
          detectedType === 'space' ? containerSpaceName : ''
        ),
        modified: formatTime(child.updatedAt),
        modifiedBy: child.user_id || 'Unknown User',
        sharing: rawData[0].is_private ? 'Private' : 'Public',
        pinned: child.pinned,
        space_id: child.space_id,
      };
    });
  }, [rawData, spaceNameMap, detectedType]);

  // Handler for successful deletion - refresh queries after Delete component completes API call
  const handleDeleteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['folders', id] });
    queryClient.invalidateQueries({ queryKey: ['groups', id] });
    queryClient.invalidateQueries({ queryKey: ['spaces', id] });
    queryClient.invalidateQueries({ queryKey: ['spaces'] });
  }, [queryClient, id]);

  const handleBulkDeleteSuccess = handleDeleteSuccess;

  // Handler for successful edit - invalidate queries to refetch
  const handleEditSuccess = useCallback((fileId, fileType, updatedData) => {
    // Invalidate queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['folders', id] });
    queryClient.invalidateQueries({ queryKey: ['groups', id] });
    queryClient.invalidateQueries({ queryKey: ['spaces', id] });
    queryClient.invalidateQueries({ queryKey: ['spaces'] });
  }, [queryClient, id]);

  // Callbacks for handling data changes
  const handleDataChange = useCallback((updatedData) => {
    // TanStack Query will handle updates automatically through cache invalidation
    if (updatedData) {
      queryClient.invalidateQueries({ queryKey: ['folders', id] });
      queryClient.invalidateQueries({ queryKey: ['groups', id] });
      queryClient.invalidateQueries({ queryKey: ['spaces', id] });
    }
  }, [queryClient, id]);

  // Create columns with handlers attached
  const columns = useMemo(
    () => createColumns(handleDeleteSuccess, handleEditSuccess),
    [handleDeleteSuccess, handleEditSuccess]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <>
      <DataTableColumnHeader 
        title={containerName} 
        table={table} 
        containerId={id}
        containerType={detectedType}
        onBulkDeleteSuccess={handleBulkDeleteSuccess}
      />
      <DataTableColumnBody 
        table={table} 
        loading={loading} 
        onDataChange={handleDataChange} 
      />
      {/* <DataTablePagination table={table} /> */}
    </>
  )
}

export default DataTable;