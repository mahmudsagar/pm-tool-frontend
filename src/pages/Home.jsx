"use client"
import React, { useState } from 'react';
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
  
  const {
    spaceFiles, 
  } = useFileManagerStore(state => state);

  const table = useReactTable({
    data: spaceFiles || [],
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
      <DataTableColumnHeader title="My Files" table={table} />
      <DataTableColumnBody table={table} />
    </section>
  );
};

export default Home;
