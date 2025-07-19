"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useFileManagerStore from '@/stores/useFileManagerStore';
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

function DataTable() {
  let { id, type } = useParams();
  const [tableData, setTableData] = useState([]);
  console.log("🚀 ~ DataTable ~ tableData:", tableData)
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const { formatTableData, documents } = useFileManagerStore(state => state);

  // Callbacks for handling delete and edit operations
  const handleDataChange = useCallback((updatedData, handlers) => {
    // If we received updated data, update the table
    if (updatedData) {
      setTableData(updatedData);
    }
  }, []);

  // Handler for successful deletion
  const handleDeleteSuccess = useCallback((fileId, fileType) => {
    // Update the UI by removing the deleted item
    setTableData(prev => prev.filter(item => item.id !== fileId));
  }, []);

  // Handler for successful edit
  const handleEditSuccess = useCallback((fileId, fileType, updatedData) => {
    // Update the UI by updating the edited item
    setTableData(prev => prev.map(item => {
      if (item.id === fileId) {
        // If we have updated data, merge it
        if (updatedData) {
          return { ...item, ...updatedData };
        }
        // Otherwise just update the modified timestamp
        return { 
          ...item, 
          modified: new Date().toLocaleString()
        };
      }
      return item;
    }));
  }, []);

  // Create columns with handlers attached
  const columns = createColumns(handleDeleteSuccess, handleEditSuccess);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const result = await formatTableData(id, type);
        setTableData(result);
        setLoading(false);      
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id, type, formatTableData, documents]);

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