import React from 'react';
import { cn } from '@/lib/utils';
import { File } from 'lucide-react';
import { Link } from 'react-router-dom';
import FolderMenu from './DropdownMenuItems/FolderMenu';

function DocStructure({ 
  docId, 
  docName, 
  docType,
  fileType,
  isOpen, 
  showIcon,
  className, 
  dropdownOpenStates, 
  handleDropdownToggle 
}) {  
  return (
    <div className="group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline">
      <div className="flex justify-between items-center">
        <span className="inline">{ showIcon(docType, fileType) } </span>
        <Link 
          to={`/document/${docId}`} 
          className={cn('absolute left-10 text-sm duration-200 w-[155px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
        >
          { docName }
        </Link>
      </div>
      <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
        <div className="flex gap-1">
          <FolderMenu
            isOpen={dropdownOpenStates}
            onToggle={(id) => handleDropdownToggle(id)}
            id={docId}
            type={docType}
          />
        </div>
      </div>
    </div>
  )
}

export default DocStructure