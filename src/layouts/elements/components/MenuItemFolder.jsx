import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useSidebar } from "@/stores/store";
import useFileManagerStore from "@/stores/useFileManagerStore";
import folderIcon from '@/assets/images/folder.svg';
import AddFileDialog from "./AddFileDialog";
import DocumentsList from "./FolderDocument";
import FileDropdownMenu from "./FileDropdownMenu";
import { 
  FileText, 
  CircuitBoard,
  ChevronDownIcon,
  FileSpreadsheet
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../subnav-accordion";

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

  const handleDropdownToggle = (id) => {
    setDropdownOpenStates(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };  

  const handleFolderClick = async (id) => {
    setOpenItem(openItem === id ? "" : id);

    if (!documents[id]) {
      setLoading(true);
      try {
        await fatchDocument(id);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    }
  };  

  const handleDocumentIcons = (type) => {    
    switch (type) {
      case 'sheet':
        return <FileSpreadsheet size={20} />;
      
      case 'document':
        return <FileText size={20} />;

      case 'wb':
        return <CircuitBoard size={20} />;

      default:
        return <FileSpreadsheet size={20} />;
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
                handleFolderClick(folder._id);
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
                >
                  {folder.name}
                </Link>
              </div>
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === folder._id || dropdownOpenStates[folder._id] ? 'opacity-100' : ''}`}>
                <div className="flex gap-1">
                  <AddFileDialog 
                    id={folder?._id} 
                    type={folder?.entity_type} 
                  />
                  <FileDropdownMenu
                    isOpen={dropdownOpenStates}
                    onToggle={(id) => handleDropdownToggle(id)}
                    id={folder?._id}
                    type={folder?.entity_type}
                  />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-3 py-3">
              <DocumentsList 
                key={folder?._id}
                isOpen={isOpen}
                className={className}
                loading ={loading}
                dropdownOpenStates={dropdownOpenStates}
                documents={documents[folder._id] || []}
                handleDocumentIcons={handleDocumentIcons} 
                handleDropdownToggle={handleDropdownToggle}
              />        
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : 
      (
        <div className="group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline">
          <div className="flex justify-between items-center">
            { handleDocumentIcons(folder?.page_type) }
            <Link 
              to={`/document/${folder?._id}`} 
              className={cn('absolute left-10 text-sm duration-200 w-[155px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
            >
              { `${folder?.title}.${folder?.page_type}` }
            </Link>
          </div>
          <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
            <div className="flex gap-1">
              <FileDropdownMenu
                isOpen={dropdownOpenStates}
                onToggle={(id) => handleDropdownToggle(id)}
                id={folder?._id}
                type={folder?.entity_type}
              />
            </div>
          </div>
        </div>
      )}      
    </>
  );
};

export default MenuItemFolder;
