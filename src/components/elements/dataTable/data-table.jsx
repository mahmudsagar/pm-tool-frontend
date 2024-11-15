"use client"
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useFileManagerStore from '@/stores/useFileManagerStore';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import columns from './table-columns';
import DataTablePagination from './data-table-pagination';
import DataTableColumnBody from './data-table-body';
import DataTableColumnHeader from './data-table-header';

function DataTable() {
  let { id, type } = useParams();
  const [tableData, setTableData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const { formatTableData } = useFileManagerStore(state => state);

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
  }, [id]); 
  
  console.log(tableData);
  

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
      <DataTableColumnBody table={table} loading={loading} />
      {/* <DataTablePagination table={table} /> */}
    </>
  )
}

export default DataTable;