import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ArrowDownWideNarrow,
  AlignLeft,
  LogOut,
  ArrowUpAZ,
  ArrowDownZA,
  CircleX,
  Plus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import AddMyFilesDialog from '@/layouts/elements/components/AddMyFilesDialog';
import { useMatches } from 'react-router-dom';

const DataTableColumnHeader = ({ title, table, containerId, containerType }) => {
  let matches = useMatches();
  const [isOpen, setIsOpen] = useState(false);
  const handleMyFiles = () =>{
    setIsOpen((current) => !current);

  }
  
  // Determine the effective ID and type for the AddFileDialog
  // Priority: props from DataTable > route params
  const effectiveId = containerId || matches[matches.length - 1]?.params?.id;
  const effectiveType = containerType || matches[matches.length - 1]?.params?.type;
  
  return (
    <div className="flex items-center justify-between pb-6">
      <div className='flex items-center gap-2'>
      <h3 className='text-xl font-medium'>{title}</h3>
        <Button variant="outline" className="flex items-center justify-center text-base gap-2 bg-none border-none focus:outline-none">
          <Plus onClick={() => handleMyFiles()} className='w-4 h-4' />
        </Button>
      </div>
      <div className='menu-buttons flex items-center gap-8'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="font-medium flex items-center justify-center text-base gap-2 bg-none border-none focus:outline-none">
              <ArrowDownWideNarrow className='w-4 h-4' />
              Sort
              <ChevronDown className='w-4 h-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("name").toggleSorting(true)}>
              <ArrowUpAZ className='w-4 h-4' />
              Asc
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => table.getColumn("name").toggleSorting(false)}>
              <ArrowDownZA className='w-4 h-4' />
              Desc
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 font-medium" onClick={() => setSorting([])}>
              <CircleX className='w-4 h-4' />
              Unsorted
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isOpen ? 
        <AddMyFilesDialog 
          id={effectiveId}
          type={effectiveType}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
      /> : null}
    </div>
  )
}

export default DataTableColumnHeader