import React, { useState } from 'react';
import useFileManagerStore from "@/stores/useFileManagerStore";
import folderIcon from '@/assets/images/folder.svg';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  AccordionContent,
  AccordionTrigger,
} from "../subnav-accordion";
import { 
  ChevronDownIcon,
  FolderOpen,
} from "lucide-react";
import AddFileDialog from './AddFileDialog';
import FileDropdownMenu from './FileDropdownMenu';
import FolderDocument from './FolderDocument';
import MenuItemLoading from './MenuItemLoading';

const FolderStructure = ({ 
  data, 
  openItem, 
  setOpenItem, 
  dropdownOpenStates, 
  handleDropdownToggle, 
  handleDocumentIcons, 
  isOpen, 
  className 
}) => {
  const [loading, setLoading] = useState(false);
  const { fatchDocument, documents } = useFileManagerStore(state => state);    

  const handleFolderClick = async (id, type) => {   
     
    setOpenItem(openItem === id ? "" : id);

    if (!documents[id]) {
      setLoading(true);
      try {
        await fatchDocument(id, type);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    }
  };  

  return (
    <>
      <AccordionTrigger
        className='group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline'
        onClick={(e) => {
          e.stopPropagation();
          handleFolderClick(data?._id, data?.entity_type);
        }}
      >
        <div className="flex justify-between items-center">
          <img
            src={folderIcon}
            alt="Folder Icon"
            width={18}
            className={cn('inline group-hover:hidden group-data-[state=open]:hidden')}
          />
          <ChevronDownIcon
            strokeWidth={2.5}
            size={20}
            className={cn(
              'hidden group-hover:inline group-data-[state=open]:inline shrink-0 transition-transform duration-200',
              { 'inline': openItem === data._id }
            )}
          />
          <Link 
            to={`/file-manager/${data?.entity_type}/${data._id}`} 
            className={cn('absolute left-10 text-sm duration-200 text-start w-[135px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
          >
            { data.name }
          </Link>
        </div>
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === data._id || dropdownOpenStates[data._id] ? 'opacity-100' : ''}`}>
          <div className="flex gap-1">
            <AddFileDialog 
              id={data?._id} 
              type={data?.entity_type} 
            />
            <FileDropdownMenu
              isOpen={dropdownOpenStates}
              onToggle={(id) => handleDropdownToggle(id)}
              id={data?._id}
              type={data?.entity_type}
            />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-2 pl-3 py-3">
        { loading ? <MenuItemLoading text='Loading...' flex='col' /> : 
         Array.isArray(documents[data._id]) && documents[data._id]?.length > 0 ? (
          <FolderDocument
            isOpen={isOpen}
            loading={loading}
            className={className}
            openItem={openItem}
            setOpenItem={setOpenItem}
            values={documents[data._id][0].childs}
            handleDocumentIcons={handleDocumentIcons}
            dropdownOpenStates={dropdownOpenStates}
            handleDropdownToggle={handleDropdownToggle}
          />
        ) : (
          <div className="flex items-center justify-center flex-col gap-2 py-2">
            <FolderOpen />
            <p className="text-center">No Files Available.</p>
          </div>
        )}
      </AccordionContent>
    </>
  )
}

export default FolderStructure