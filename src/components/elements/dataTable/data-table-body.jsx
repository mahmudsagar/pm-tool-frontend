import React from 'react';
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

const DataTableColumnBody = ({ table, loading }) => {
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
                    let target = cell?.row?.original?.type === 'folder' ? "_self" : "_sidebar";
                    let path = cell?.row?.original?.type === 'folder' ? `/file-manager/${cell?.row?.original?.type}/${cell?.row?.original?.id}` : `/document/${cell?.row?.original?.id}`;
                    
                    return (
                      <TableCell key={cell.id}>
                        <Link to={path} target={target}>                    
                          { flexRender( cell?.column?.columnDef?.cell, cell.getContext()) }
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
  )
}

export default DataTableColumnBody;