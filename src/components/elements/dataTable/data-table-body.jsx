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
import { getRowPath } from './tableRowUtils';

const DataTableColumnBody = ({ table, loading, onDataChange }) => {
  const [tableData, setTableData] = useState(table?.options?.data || []);

  useEffect(() => {
    if (table?.options?.data) {
      setTableData(table.options.data);
    }
  }, [table?.options?.data]);

  const handleDeleteSuccess = useCallback((fileId) => {
    const updatedData = tableData.filter((item) => item.id !== fileId);
    setTableData(updatedData);

    if (table?.setData) {
      table.setData(updatedData);
    }

    if (typeof onDataChange === 'function') {
      onDataChange(updatedData);
    }
  }, [tableData, table, onDataChange]);

  const handleEditSuccess = useCallback((fileId, _fileType, updatedItem) => {
    const updatedData = tableData.map((item) => {
      if (item.id === fileId) {
        if (updatedItem) {
          return { ...item, ...updatedItem };
        }
        return {
          ...item,
          modified: new Date().toLocaleString(),
        };
      }
      return item;
    });

    setTableData(updatedData);

    if (table?.setData) {
      table.setData(updatedData);
    }

    if (typeof onDataChange === 'function') {
      onDataChange(updatedData);
    }
  }, [tableData, table, onDataChange]);

  useEffect(() => {
    if (table && typeof onDataChange === 'function') {
      onDataChange(null, {
        deleteHandler: handleDeleteSuccess,
        editHandler: handleEditSuccess,
      });
    }
  }, [table, handleDeleteSuccess, handleEditSuccess, onDataChange]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead className="text-[#334155]" key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header?.column?.columnDef?.header,
                      header.getContext()
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? <TableLoading /> :
            table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const path = getRowPath(row);

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cellContent = flexRender(cell?.column?.columnDef?.cell, cell.getContext());
                      const isSelectColumn = cell.column.id === 'select';
                      const isActionsColumn = cell.column.id === 'actions';
                      const isNameColumn = cell.column.id === 'name';

                      if (isSelectColumn || isActionsColumn) {
                        return (
                          <TableCell key={cell.id}>
                            {cellContent}
                          </TableCell>
                        );
                      }

                      if (isNameColumn) {
                        return (
                          <TableCell key={cell.id}>
                            <Link to={path} target="_sidebar" className="block min-w-0">
                              {cellContent}
                            </Link>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={cell.id}>
                          {cellContent}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
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
