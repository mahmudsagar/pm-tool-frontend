import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useSidebar } from "@/stores/store";
import { ChevronDownIcon } from "lucide-react";
import useFileManagerStore from "@/stores/useFileManagerStore";
import folderIcon from '@/assets/images/folder.svg';
import AddFileDialog from "./AddFileDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../subnav-accordion";
import MenuItemLoading from "./MenuItemLoading";
import MenuEmpty from "./MenuEmpty";
import FolderMenu from "./DropdownMenuItems/FolderMenu";
import DocStructure from "./DocStructure";
import { baseUrl } from '@/utils/constants';

const MenuItemFolder = ({ folder, className }) => {    
  const { isOpen } = useSidebar();
  const [loading, setLoading] = useState(false)
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const { storeDocuments, documents } = useFileManagerStore(state => state);      

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

  const handleFolderClick = async (id, type) => {    
    let endPoint;
    setOpenItem(openItem === id ? "" : id);
    
    if (type === "folder"){
      endPoint = `/v1/folder?id=${id}`;
    } else if (type === "group"){
      endPoint = `/v1/group?id=${id}`;      
    } else {
      return { error: "Invalid filetype specified!" };
    }
    
    if (!documents[id]) {
      setLoading(true);
      try {
        await fetch(baseUrl + endPoint, { method: 'GET', })
        .then((res) => res.json())
        .then(res => {
          storeDocuments(res.data, id);
          setLoading(false);
        });
      } catch (error) {
        console.error("Get document error: " + error);  
        setLoading(false);      
      } finally {
        setLoading(false);
      }      
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
                handleFolderClick(folder?._id, folder?.entity_type);
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
                  to={`/file-manager/${folder?.entity_type}/${folder._id}`} 
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
                  <FolderMenu
                    isOpen={dropdownOpenStates}
                    onToggle={(id) => handleDropdownToggle(id)}
                    id={folder?._id}
                    type={folder?.entity_type}
                  />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-3 py-3">
              { loading ? <MenuItemLoading text='Loading...' flex='col' /> :                 
                Array.isArray(documents[folder?._id]) && documents[folder?._id].length > 0 ? 
                  documents[folder?._id].map( doc => 
                    Array.isArray(doc.childs) && doc.childs.length > 0 ? 
                      doc?.childs.map( item => item.entity_type === 'folder' ? (<p key={item?._id}>Folder</p>):(
                        <DocStructure
                          key={item?._id}
                          docId = {item?._id}
                          docName = {`${item?.title}.${item?.page_type}`} 
                          docType = {item?.entity_type}
                          isOpen = {isOpen}
                          className = {className}
                          dropdownOpenStates = {dropdownOpenStates}
                          handleDropdownToggle = {handleDropdownToggle}
                        />
                      ))
                    :(
                    <MenuEmpty/> // Document Child Empty
                  )) : (
                  <MenuEmpty/> // Document Empty
                )                
              }
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : 
      (
        <DocStructure
          docId = {folder?._id}
          docName = {`${folder?.title}.${folder?.page_type}`} 
          docType = {folder?.entity_type}
          isOpen = {isOpen}
          className = {className}
          dropdownOpenStates = {dropdownOpenStates}
          handleDropdownToggle = {handleDropdownToggle}
        />
      )}      
    </>
  );
};

export default MenuItemFolder;
