"use client"
import React, { useEffect, useState } from 'react';
import useApi from '@/lib/dataFetcher';
import { baseUrl, userID } from '@/utils/constants';
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
  const { data: users, callApi: userCallApi } = useApi();
  const { loading: spaceLoading, data: spaces, callApi: spaceCallApi } = useApi();
  
  const { 
    storeState, 
    spaceFiles, 
    publicSpaces, 
    formatSpaces, 
    privateSpaces, 
  } = useFileManagerStore(state => state);
  const userId = '66cda5dac6886719e3345c19';
  useEffect(() => {
    if (!publicSpaces || publicSpaces.length === 0 || !privateSpaces || privateSpaces.length === 0) {
      spaceCallApi(baseUrl + '/v1/space?user_id=' + userId);
      userCallApi(baseUrl + '/v1/user');
    }
  }, [ spaceCallApi, publicSpaces, privateSpaces]);

  useEffect(() => {
    if (spaces) {      
      storeState('users', users);
      formatSpaces(spaces);
    }
  }, [ spaces, formatSpaces ]);  


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
      <DataTableColumnBody table={table} loading={spaceLoading} />
    </section>
  );
};

export default Home;
