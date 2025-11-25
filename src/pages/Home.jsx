"use client"
import { useState, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
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
  const groupId = searchParams.get('groupId');
  const location = useLocation();

  // Parse path-based ids (support routes like /file-manager/folder/:id or /file-manager/group/:id and /space/:id)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const pathFolderId = (
    (pathParts[0] === 'file-manager' && pathParts[1] === 'folder' && pathParts[2]) ||
    (pathParts[0] === 'folder' && pathParts[1]) ||
    null
  );
  const pathGroupId = (
    (pathParts[0] === 'file-manager' && pathParts[1] === 'group' && pathParts[2]) ||
    (pathParts[0] === 'group' && pathParts[1]) ||
    null
  );
  const pathSpaceId = (
    (pathParts[0] === 'space' && pathParts[1]) ||
    null
  );

  // Effective ids prefer query params but fall back to path params
  const effectiveSpaceId = spaceId || pathSpaceId || null;
  const effectiveFolderId = folderId || pathFolderId || null;
  const effectiveGroupId = groupId || pathGroupId || null;


  // Determine title based on active filter
  const getPageTitle = () => {
    if (filterType === 'private') return 'Private Space';
    if (filterType === 'team') return 'Team Space';
    if (effectiveSpaceId) {
      const allSpaces = [...(publicSpaces || []), ...(privateSpaces || [])];
      const space = allSpaces.find(s => s._id === effectiveSpaceId);
      return space ? space.name : 'Space Files';
    }
    // If inside a group, show the group's name if available
    if (effectiveGroupId) {
      const allSpaces = [...(publicSpaces || []), ...(privateSpaces || [])];
      // Search top-level spaces and their children
      for (const space of allSpaces) {
        if (space._id === effectiveGroupId) return space.name;
        if (Array.isArray(space.childs)) {
          const found = space.childs.find(c => c._id === effectiveGroupId && c.entity_type === 'group');
          if (found) return found.name || found.title || 'Group Files';
        }
      }
      // Fallback to spaceFiles lookup
      const file = spaceFiles?.find(f => f.id === effectiveGroupId);
      if (file) return file.name || file.title || 'Group Files';
      return 'Group Files';
    }

    // If inside a folder, show the folder's name if available
    if (effectiveFolderId) {
      const allSpaces = [...(publicSpaces || []), ...(privateSpaces || [])];
      for (const space of allSpaces) {
        if (Array.isArray(space.childs)) {
          const found = space.childs.find(c => c._id === effectiveFolderId && (c.entity_type === 'folder' || c.entity_type === 'group'));
          if (found) {
            return found.name || found.title || 'Folder Files';
          }
        }
      }
      const file = spaceFiles?.find(f => f.id === effectiveFolderId);
      if (file) {
        return file.name || file.title || 'Folder Files';
      }
      return 'Folder Files';
    }
    return 'My Files';
  };

  // Filter data based on URL parameters
  const filteredData = useMemo(() => {
    if (!spaceFiles || spaceFiles.length === 0) return [];

    // If no filters, return all data
    if (!filterType && !effectiveSpaceId && !effectiveFolderId && !effectiveGroupId) {
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
    if (effectiveSpaceId) {
      const allSpaces = [...(publicSpaces || []), ...(privateSpaces || [])];
      const targetSpace = allSpaces.find(s => s._id === effectiveSpaceId);
      
      if (targetSpace) {
        const spaceChildIds = new Set([effectiveSpaceId]);
        
        // Add child IDs from the specific space
        if (targetSpace.childs) {
          targetSpace.childs.forEach(child => spaceChildIds.add(child._id));
        }

        filtered = filtered.filter(file => {
          return file.space_id === effectiveSpaceId ||
                 file.folder_id === effectiveSpaceId ||
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
    if (effectiveFolderId) {
      filtered = filtered.filter(file => {
        return file.folder_id === effectiveFolderId || file._id === effectiveFolderId;
      });
    }

    // Filter by specific group ID
    if (effectiveGroupId) {
      filtered = filtered.filter(file => {
        return file.folder_id === effectiveGroupId || file._id === effectiveGroupId || file.group_id === effectiveGroupId;
      });
    }

    return filtered;
  }, [spaceFiles, filterType, effectiveSpaceId, effectiveFolderId, effectiveGroupId, publicSpaces, privateSpaces]);

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

  // Determine the container context for the add button
  const containerId = effectiveFolderId || effectiveGroupId || effectiveSpaceId || null;
  const containerType = effectiveFolderId ? 'folder' : effectiveGroupId ? 'group' : effectiveSpaceId ? 'space' : null;

  return (
    <section className='w-full py-9 px-6'>
      <DataTableColumnHeader 
        title={getPageTitle()} 
        table={table}
        containerId={containerId}
        containerType={containerType}
      />
      <DataTableColumnBody table={table} />
    </section>
  );
};

export default Home;
