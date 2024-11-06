import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "@/BetterRouter/Link";
import { useSidebar } from "@/stores/store";
import useFileManagerStore from "@/stores/useFileManagerStore";
import { 
  ChevronDownIcon, 
  FileText, 
  CircuitBoard,
  FolderOpen
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../subnav-accordion";
import { FileSpreadsheet } from 'lucide-react';
import AddFileDialog from "./AddFileDialog";
import FileDropdownMenu from "./FileDropdownMenu";
import folderIcon from '@/assets/images/folder.svg';
import MenuItemLoading from "./MenuItemLoading";

const MenuItemFolder = ({ folder, className }) => {  
  const { isOpen } = useSidebar();
  const [openItem, setOpenItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const { fatchDocument, documents } = useFileManagerStore(state => state);  

  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
  }, [isOpen]);

  const handleDropdownToggle = (id, isOpenState = null) => {
    setDropdownOpenStates((prevState) => ({
      ...prevState,
      [id]: isOpenState !== null ? isOpenState : !prevState[id],
    }));
  };  

  const handleFolderClick = async (id) => {
    setOpenItem(openItem === id ? "" : id);

    if (!openItem) {      
      setLoading(true);
      try {        
        await fatchDocument(id);
        setLoading(false);      
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    }
  };

  const handleDocumentIcons = (type) => {    
    switch (type) {
      case 'sheet':
        return <FileSpreadsheet size={20} />;
      break;
      
      case 'document':
        return <FileText size={20} />;
      break;

      case 'wb':
        return <CircuitBoard size={20} />;
      break;

      default:
        return <FileSpreadsheet size={20} />;
      break;
    }
  }

  return (
    <>
      { folder.entity_type !== 'page' ? (
        <Accordion
          type="single"
          collapsible
          className="space-y-2"
          value={openItem}
          onValueChange={(value) => setOpenItem(value)}
        >
          <AccordionItem value={folder._id} className="border-none ">
            <AccordionTrigger
              className={cn(
                'group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline',
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleFolderClick(folder._id); // Call handleFolderClick with the folder ID
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
                    { 'inline': openItem === folder._id }
                  )}
                />
                <Link 
                  to={`/file-manager/${folder._id}`} 
                  className={cn('absolute left-10 text-sm duration-200 text-start w-[135px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
                  // onClick={handleFolderClick}
                >
                  {folder.name}
                </Link>
              </div>
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === folder._id || dropdownOpenStates[folder._id] ? 'opacity-100' : ''}`}>
                <div className="flex gap-1">
                  <AddFileDialog id={folder._id} />
                  <FileDropdownMenu
                    isOpen={dropdownOpenStates}
                    onToggle={(id) => handleDropdownToggle(id)}
                    folderId={folder._id}
                  />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-6 py-3">
              { loading && <MenuItemLoading text='Loading...' flex='col' /> }
              { !loading && (
                Array.isArray(documents) && documents.length > 0 ? 
                  documents.map( document => 
                    <Link 
                      key={document._id} 
                      to={`/document/${document.pageMeta._id}`}
                      className="ml-5 flex items-center gap-2"
                    >
                      { handleDocumentIcons(document.pageMeta.page_type) }
                      <span>{`${document.pageMeta.title}.${document.pageMeta.page_type}`}</span>
                    </Link>
                  ) : 
                  ( 
                    <div className="flex items-center justify-center flex-col gap-2 py-2">
                      <FolderOpen/>
                      <p className="text-center">No Files Available.</p> 
                    </div>
                  )
              )}
             
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : 
      (
        <div className="group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline">
          <div className="flex justify-between items-center">
            { handleDocumentIcons(folder?.pageMeta[0]?.page_type) }
            <Link 
              to={`/document/${folder?.pageMeta[0]?._id}`} 
              className={cn('absolute left-10 text-sm duration-200 w-[165px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
            >
              { `${folder?.pageMeta[0]?.title}.${folder?.pageMeta[0]?.page_type}` }
            </Link>
          </div>
          <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
            <div className="flex gap-1">
              <FileDropdownMenu
                isOpen={dropdownOpenStates}
                onToggle={(id) => handleDropdownToggle(id)}
                folderId={folder?.pageMeta[0]?._id}
              />
            </div>
          </div>
        </div>
      )}      
    </>
  );
};

export default MenuItemFolder;
