import React from 'react'
import { Link } from 'react-router-dom'
import FileDropdownMenu from './FileDropdownMenu'
import { cn } from '@/lib/utils'

const MenuSpaceFile = ({ datas, handleDocumentIcons, dropdownOpenStates, handleDropdownToggle, isOpen, className }) => {  
  console.log(datas);
      
  return (
    <>    
      { datas.map(data => 
        <div key={data?._id} className="group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline">
          <div className="flex justify-between items-center">
            { handleDocumentIcons(data?.page_type) }
            <Link 
              to={`/document/${data?._id}`} 
              className={cn('absolute left-10 text-sm duration-200 w-[155px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
            >
              { `${data?.name}.${data?.page_type}` }
            </Link>
          </div>
          <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
            <div className="flex gap-1">
              <FileDropdownMenu
                isOpen={dropdownOpenStates}
                onToggle={(id) => handleDropdownToggle(id)}
                id={data?._id}
                type={data?.entity_type}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MenuSpaceFile