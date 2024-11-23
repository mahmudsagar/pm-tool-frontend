import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

const TableLoading = () => {
  return (
    <>
      { Array.from({ length: 8 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-4 rounded-sm border border-slate-400 bg-slate-300" />
          </TableCell>
          <TableCell>
            <div className='flex items-center gap-3'>
              <Skeleton className="h-10 w-10 rounded-full bg-slate-300" />
              <Skeleton className="h-3 w-[180px] rounded-full bg-slate-300" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-[100px] rounded-full bg-slate-300" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-[100px] rounded-full bg-slate-300" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-3 w-[60px] rounded-full bg-slate-300" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default TableLoading