"use client"
import { useState, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useFolderContents, useGroupContents, useSpaceContents } from '@/hooks/queries/useFilesQueries';
import { useQueryClient } from '@tanstack/react-query';
import { baseUrl } from '@/utils/constants';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { createColumns } from './table-columns';
import DataTablePagination from './data-table-pagination';
import DataTableColumnBody from './data-table-body';
import DataTableColumnHeader from './data-table-header';
import { Folder, File } from 'lucide-react';

function DataTable() {
  let { id, type } = useParams();
  const location = useLocation();
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const queryClient = useQueryClient();

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

  // Transform data for table display
  const tableData = useMemo(() => {
    if (!rawData || !rawData[0]?.childs) return [];

    return rawData[0].childs.map((child) => {
      const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
      };

      return {
        id: child._id,
        type: child.entity_type,
        icon: child.entity_type === 'folder' ? Folder : File,
        name: child.entity_type === 'folder' 
          ? child.name 
          : `${child.title}.${child.page_type}`,
        modified: formatTime(child.updatedAt),
        modifiedBy: child.user_id || 'Unknown User',
        sharing: rawData[0].is_private ? 'Private' : 'Public',
        pinned: child.pinned,
        space_id: child.space_id,
      };
    });
  }, [rawData]);

  // Handler for successful deletion - invalidate queries to refetch
  const handleDeleteSuccess = useCallback(async (fileId, fileType) => {
    // Attempt to call backend delete API for the given file
    try {
      let endPoint;

      if (fileType === "page") {
        endPoint = `/v1/page/document?id=${fileId}`;
      } else if (fileType === "folder"){
        endPoint = `/v1/folder?id=${fileId}`;
      } else if (fileType === "group"){
        endPoint = `/v1/group?id=${fileId}`;
      }

      if (endPoint) {
        const token = localStorage.getItem('token');
        await fetch(baseUrl + endPoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      }
    } catch (error) {
      console.error('Error calling delete API:', error);
    } finally {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['folders', id] });
      queryClient.invalidateQueries({ queryKey: ['groups', id] });
      queryClient.invalidateQueries({ queryKey: ['spaces', id] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    }
  }, [queryClient, id]);

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
  const columns = createColumns(handleDeleteSuccess, handleEditSuccess);

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
      <DataTableColumnHeader title="My Files" table={table} />
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