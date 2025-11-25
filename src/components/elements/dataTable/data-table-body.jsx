import React, { useState, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";
import TableLoading from './components/table-loading';
import Link from '@/BetterRouter/Link';
import { createColumns } from './table-columns';

const DataTableColumnBody = ({ table, loading, onDataChange }) => {
  // Store a local copy of data for instant updates
  const [tableData, setTableData] = useState(table?.options?.data || []);

  // Update local data when external data changes
  useEffect(() => {
    if (table?.options?.data) {
      setTableData(table.options.data);
    }
  }, [table?.options?.data]);

  // Handler for successful deletion
  const handleDeleteSuccess = useCallback((fileId, fileType) => {
    // Update local state immediately for UI feedback
    const updatedData = tableData.filter(item => item.id !== fileId);
    setTableData(updatedData);
    
    // Force table state update to reflect changes
    if (table && table.setData) {
      table.setData(updatedData);
    }
    
    // Call parent callback if provided to update data at parent level
    if (typeof onDataChange === 'function') {
      onDataChange(updatedData);
    }
  }, [tableData, table, onDataChange]);

  // Handler for successful edit
  const handleEditSuccess = useCallback((fileId, fileType, updatedItem) => {
    // Update the item in the local data
    const updatedData = tableData.map(item => {
      if (item.id === fileId) {
        // If we received an updated item, use its values
        if (updatedItem) {
          return { ...item, ...updatedItem };
        }
        // Otherwise just refresh the modified date
        return { 
          ...item, 
          modified: new Date().toLocaleString()
        };
      }
      return item;
    });
    
    setTableData(updatedData);
    
    // Force table state update to reflect changes
    if (table && table.setData) {
      table.setData(updatedData);
    }
    
    // Call parent callback if provided
    if (typeof onDataChange === 'function') {
      onDataChange(updatedData);
    }
  }, [tableData, table, onDataChange]);

  // Ensure columns are updated with handlers
  useEffect(() => {
    if (table) {
      // Inform the component using the table about our handlers
      if (typeof onDataChange === 'function') {
        onDataChange(null, { 
          deleteHandler: handleDeleteSuccess,
          editHandler: handleEditSuccess 
        });
      }
    }
  }, [table, handleDeleteSuccess, handleEditSuccess, onDataChange]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead className="text-[#334155]" key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header?.column?.columnDef?.header,
                        header.getContext()
                      )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          { loading ? <TableLoading/> : 
            table.getRowModel().rows?.length  ? (
              table.getRowModel().rows?.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {                    
                    const original = cell?.row?.original || {};
                    // If this is a board (either entity_type 'board' or page_type 'board'), route to /board/:id
                    let path = `/document/${original.id}`;
                    if (original.type === 'folder' || original.type === 'group') {
                      path = `/file-manager/${original.type}/${original.id}`;
                    } else if (original.type === 'board' || original.page_type === 'board') {
                      path = `/board/${original.id}`;
                    }
                    
                    // Check if this is the name column that contains action buttons
                    const cellContent = flexRender(cell?.column?.columnDef?.cell, cell.getContext());

                    // For the name column that contains dropdowns, render differently
                    if (cell.column.id === "name") {
                      return (
                        <TableCell key={cell.id} onClick={(e) => {
                          // Only navigate if not clicking on the action buttons section
                          if (e.target.closest('.transition-opacity')) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}>
                          <Link to={path} target="_sidebar">
                            {cellContent}
                          </Link>
                        </TableCell>
                      );
                    }
                    
                    return (
                      <TableCell key={cell.id}>
                        <Link to={path} target="_sidebar">                    
                          {cellContent}
                        </Link>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No files are found!
                </TableCell>
              </TableRow>
            )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTableColumnBody;