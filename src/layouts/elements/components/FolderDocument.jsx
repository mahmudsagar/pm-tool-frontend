import { useMemo } from "react";
import { FolderOpen } from "lucide-react";
import MenuItemLoading from "./MenuItemLoading";
import MenuSpaceFile from "./MenuSpaceFile";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import FileDropdownMenu from "./FileDropdownMenu";
import FolderStructure from "./FolderStructure";

const FolderDocument = ({ 
  values, 
  isOpen, 
  loading, 
  openItem, 
  className, 
  setOpenItem, 
  dropdownOpenStates, 
  handleDocumentIcons, 
  handleDropdownToggle 
}) => {
  
  // const renderedDocuments = useMemo(() => {
  //   if (!documents[0]?.childs || documents[0]?.childs.length === 0) {
  //     return (
  //       <div className="flex items-center justify-center flex-col gap-2 py-2">
  //         <FolderOpen />
  //         <p className="text-center">No Files Available.</p>
  //       </div>
  //     );
  //   }

  //   return documents.map((document) => (
  //     <MenuSpaceFile
  //       key={document._id}
  //       isOpen={isOpen}
  //       className={className}
  //       datas={document?.childs}
  //       dropdownOpenStates={dropdownOpenStates}
  //       handleDocumentIcons={handleDocumentIcons}
  //       handleDropdownToggle={handleDropdownToggle}
  //     />
  //   ));
  // }, [documents, handleDocumentIcons]);

  if (loading) {
    return <MenuItemLoading text='Loading...' flex='col' />;
  }  

  // return <>{!loading && renderedDocuments}</>;
  return (
    <>
      {Array.isArray(values) && values.length > 0 && values.map(item => (
        item.entity_type === 'folder' || item.entity_type === 'group' ? (
          <FolderStructure
            key={item?._id}
            data={values}
            openItem={openItem}
            setOpenItem={setOpenItem}
            dropdownOpenStates={dropdownOpenStates}
            handleDropdownToggle={handleDropdownToggle}
            handleDocumentIcons={handleDocumentIcons}
            isOpen={isOpen}
            className={className}
          />
        ) : (
          <div 
            key={item?._id} 
            className="group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline"
          >
            <div className="flex justify-between items-center">
              {handleDocumentIcons(item?.page_type)}
              <Link 
                to={`/document/${item?._id}`} 
                className={cn('absolute left-10 text-sm duration-200 w-[155px] whitespace-nowrap overflow-hidden overflow-ellipsis', !isOpen && className)}
              >
                {`${item?.name}.${item?.page_type}`}
              </Link>
            </div>
            <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
              <div className="flex gap-1">
                <FileDropdownMenu
                  isOpen={dropdownOpenStates}
                  onToggle={(id) => handleDropdownToggle(id)}
                  id={item?._id}
                  type={item?.entity_type}
                />
              </div>
            </div>
          </div>
        )
      ))}
    </>
  );
};

export default FolderDocument;