"use client"
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import useFileManagerStore from '@/stores/useFileManagerStore';
import columns from '@/components/elements/dataTable/table-columns';
import DataTableColumnBody from '@/components/elements/dataTable/data-table-body';
import DataTableColumnHeader from '@/components/elements/dataTable/data-table-header';

const Home = () => {
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [searchParams] = useSearchParams();
  
  const {
    spaceFiles,
    publicSpaces,
    privateSpaces,
  } = useFileManagerStore(state => state);

  // Get filtering parameters from URL
  const filterType = searchParams.get('filter');
  const spaceId = searchParams.get('spaceId');
  const folderId = searchParams.get('folderId');

  // Determine title based on active filter
  const getPageTitle = () => {
    if (filterType === 'private') return 'Private Space';
    if (filterType === 'team') return 'Team Space';
    if (spaceId) {
      const allSpaces = [...(publicSpaces || []), ...(privateSpaces || [])];
      const space = allSpaces.find(s => s._id === spaceId);
      return space ? space.name : 'Space Files';
    }
    if (folderId) {
      return 'Folder Files';
    }
    return 'My Files';
  };

  // Filter data based on URL parameters
  const filteredData = useMemo(() => {
    if (!spaceFiles || spaceFiles.length === 0) return [];

    // If no filters, return all data
    if (!filterType && !spaceId && !folderId) {
      return spaceFiles;
    }

    let filtered = [...spaceFiles];

    // Filter by space type (private/team)
    if (filterType === 'private') {
      const allPrivateSpaceIds = new Set();
      
      // Add IDs from private spaces
      privateSpaces?.forEach(space => {
        allPrivateSpaceIds.add(space._id);
        // Also add child folder/file IDs from private spaces
        if (space.childs) {
          space.childs.forEach(child => allPrivateSpaceIds.add(child._id));
        }
      });

      filtered = filtered.filter(file => {
        // Check if file belongs to private space
        return file.space_id && allPrivateSpaceIds.has(file.space_id) ||
               file.folder_id && allPrivateSpaceIds.has(file.folder_id) ||
               allPrivateSpaceIds.has(file._id);
      });
    } else if (filterType === 'team') {
      const allPublicSpaceIds = new Set();
      
      // Add IDs from public spaces  
      publicSpaces?.forEach(space => {
        allPublicSpaceIds.add(space._id);
        // Also add child folder/file IDs from public spaces
        if (space.childs) {
          space.childs.forEach(child => allPublicSpaceIds.add(child._id));
        }
      });

      filtered = filtered.filter(file => {
        // Check if file belongs to public space
        return file.space_id && allPublicSpaceIds.has(file.space_id) ||
               file.folder_id && allPublicSpaceIds.has(file.folder_id) ||
               allPublicSpaceIds.has(file._id);
      });
    }

    // Filter by specific space ID
    if (spaceId) {
      const allSpaces = [...(publicSpaces || []), ...(privateSpaces || [])];
      const targetSpace = allSpaces.find(s => s._id === spaceId);
      
      if (targetSpace) {
        const spaceChildIds = new Set([spaceId]);
        
        // Add child IDs from the specific space
        if (targetSpace.childs) {
          targetSpace.childs.forEach(child => spaceChildIds.add(child._id));
        }

        filtered = filtered.filter(file => {
          return file.space_id === spaceId ||
                 file.folder_id === spaceId ||
                 spaceChildIds.has(file._id) ||
                 spaceChildIds.has(file.space_id) ||
                 spaceChildIds.has(file.folder_id);
        });
      } else {
        // If space not found, show empty results
        filtered = [];
      }
    }

    // Filter by specific folder ID
    if (folderId) {
      filtered = filtered.filter(file => {
        return file.folder_id === folderId || file._id === folderId;
      });
    }

    return filtered;
  }, [spaceFiles, filterType, spaceId, folderId, publicSpaces, privateSpaces]);

  const table = useReactTable({
    data: filteredData || [],
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
    <section className='w-full py-9 px-6'>
      <DataTableColumnHeader title={getPageTitle()} table={table} />
      <DataTableColumnBody table={table} />
    </section>
  );
};

export default Home;
