import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "@/stores/store";
import useFileManagerStore from "@/stores/useFileManagerStore";
import {
  // Users, 
  // Folder,
  // FileText, 
  // StickyNote, 
  ChevronRight, 
  // FileSpreadsheet,
  ChevronDownIcon,
  // LayoutGrid,
} from 'lucide-react';
import AddFileDialog from "./AddFileDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../subnav-accordion";
import ButtonLoading from "./ButtonLoading";
import MenuEmpty from "./MenuEmpty";
import FolderMenu from "./DropdownMenuItems/FolderMenu";
import DocStructure from "./DocStructure";
import { baseUrl } from '@/utils/constants';
import EllipsisTooltip from "@/components/common/EllipsisTooltip";
import ShowIcon from "@/components/common/ShowIcon";

const MenuItemFolder = ({ folder, className, showPinnedOnly = false }) => {     
  const { isOpen } = useSidebar();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false)
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const { storeDocuments, documents } = useFileManagerStore(state => state);    
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
  }, [isOpen]);  

  const handleDropdownToggle = (id) => {
    console.log("🚀 ~ handleDropdownToggle ~ id:", id)
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

  // Handle navigation to show folder contents in main area
  const handleFolderNavigation = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (folder.entity_type === 'folder' || folder.entity_type === 'group') {
      // Navigate to home page with folder filter
      navigate(`/?folderId=${folder._id}`);
    }
  };

  // Displaying the icon based on their file format.
  // const showIcon = (file, page) => {
  //   switch (file) {
  //     case 'group':
  //       return <Users size={20} />;
  //     case 'folder':
  //       return <Folder width={20} />;
  //     case 'page':
  //       switch (page) {
  //         case 'document':
  //           return <FileText size={20} />;
  //         case 'sheet':
  //           return <FileSpreadsheet size={20} />;
  //         case 'whiteboard':
  //           return <StickyNote size={20} />;
  //         case 'board':
  //           return <LayoutGrid size={20} />;
  //         default:
  //           return <FileText size={20} />;
  //       }
  //     default:
  //       return <FileText size={20} className="inline" />;
  //   }
  // };  
          
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
          <AccordionItem value={folder._id} className="border-none mr-0">
            <AccordionTrigger
              className={cn(
                'group relative flex h-9 justify-between pl-2 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline overflow-hidden',
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleFolderClick(folder?._id, folder?.entity_type);
              }}
            >
              <div className="flex justify-between items-center gap-2 overflow-hidden">
                <span className="inline group-hover:hidden group-data-[state=open]:hidden">
                  {/* { showIcon(folder?.entity_type, folder?.page_type) } */}
                  <ShowIcon file={folder?.entity_type} page={folder?.page_type} />
                </span>
                <ChevronRight
                  strokeWidth={2.5}
                  size={20}
                  className="hidden group-hover:inline-block group-data-[state=open]:hidden"
                />
                {openItem === folder._id && (
                  <ChevronDownIcon
                    strokeWidth={2.5}
                    size={20}
                    className="shrink-0 transition-transform duration-200"
                  />
                )}
                <EllipsisTooltip title={folder?.name}
                  onClick={handleFolderNavigation}
                  className={cn('text-sm duration-200 text-start cursor-pointer hover:text-purple-600 transition-colors flex-1', !isOpen && className)}>
                  {folder?.name}
                </EllipsisTooltip>
                {/* <span 
                  onClick={handleFolderNavigation}
                  className={cn('text-sm duration-200 text-start w-[135px] whitespace-nowrap overflow-hidden overflow-ellipsis cursor-pointer hover:text-purple-600 transition-colors', !isOpen && className)}
                >
                  {folder.name}
                </span> */}
              </div>
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === folder._id || dropdownOpenStates[folder._id] ? 'opacity-100' : ''}`}>
                <div className="flex gap-1">
                  <AddFileDialog 
                    id={folder?._id} 
                    type={folder?.entity_type} 
                    isOpen={isAddModalOpen}
                    setIsOpen={setIsAddModalOpen}
                  />
                  <FolderMenu
                    isOpen={dropdownOpenStates}
                    onToggle={(id) => handleDropdownToggle(id)}
                    id={folder?._id}
                    type={folder?.entity_type}
                    fileName={folder}
                  />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 py-3">
              { loading ? <ButtonLoading text='Loading...' flex='col' /> :                 
                Array.isArray(documents[folder?._id]) && documents[folder?._id].length > 0 ? 
                  documents[folder?._id].map( doc => 
                    Array.isArray(doc.childs) && doc.childs.length > 0 ? 
                      doc?.childs.map( item => item.entity_type === 'folder' ? (<p key={item?._id}>Folder</p>):(
                        <DocStructure
                          key={item?._id}
                          docId = {item?._id}
                          docName = {item?.title} 
                          docType = {item?.entity_type}
                          fileType = { item?.page_type }
                          hasChild = {true}
                          openItem={openItem}
                          isOpen = {isOpen}
                          // showIcon={showIcon}
                          className = {className}
                          dropdownOpenStates = {dropdownOpenStates}
                          handleDropdownToggle = {handleDropdownToggle}
                        />
                      ))
                    :(
                    <MenuEmpty key={doc._id}/> // Document Child Empty
                  )) : ( null
                  // <MenuEmpty/> // Document Empty
                )                
              }
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : 
      (
        <DocStructure
          docId = {folder?._id}
          docName = {folder?.title}
          docType = {folder?.entity_type}
          fileType = {folder?.page_type}
          openItem={openItem}
          isOpen = {isOpen}
          // showIcon={showIcon}
          className = {className}
          dropdownOpenStates = {dropdownOpenStates}
          handleDropdownToggle = {handleDropdownToggle}
        />
      )}      
    </>
  );
};

export default MenuItemFolder;
