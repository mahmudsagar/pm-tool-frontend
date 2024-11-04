import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "@/BetterRouter/Link";
import { useSidebar } from "@/stores/store";
import useDocumentStore from "@/stores/useDocumentStore";
import { 
  ChevronDownIcon, 
  FileText, 
  CircuitBoard 
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

const MenuItemFolder = ({ folder, className }) => {  
  const { isOpen } = useSidebar();
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const { getDocumentByIds } = useDocumentStore(state => state);  

  const documents = getDocumentByIds('66cda5dac6886719e3345c19', folder._id) || [];

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

  const handleFolderClick = () => {
    setOpenItem(openItem === folder._id ? "" : folder._id);
  };

  const handleDocumentIcons = (type) => {
    switch (type) {
      case 'sheet':
        return <FileSpreadsheet size={20} />;
      break;
      
      case 'doc':
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
    <Accordion
      type="single"
      collapsible
      className="space-y-2"
      value={openItem}
      onValueChange={setOpenItem}
    >
      <AccordionItem value={folder._id} className="border-none ">
        <AccordionTrigger
          className={cn(
            'group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline',
          )}
          onClick={(e) => e.stopPropagation()}
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
              className={cn('absolute left-10 text-sm duration-200', !isOpen && className)}
              onClick={handleFolderClick}
            >
              {folder.name ? folder.name : 'Untitle'}
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
          { Array.isArray(documents) && documents.length > 0 ? 
            documents.map( document => 
              <Link 
                key={document._id} 
                to={`/single/${document.pageMeta._id}`}
                className="ml-5 flex items-center gap-2"
              >
                {handleDocumentIcons(document.pageMeta.page_types)}
                <span>{`${document.pageMeta.title}.${document.pageMeta.page_types}`}</span>
              </Link>
            )
          : (<>
            <p className="text-center">{documents}</p>
          </>) 
          }
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default MenuItemFolder;
