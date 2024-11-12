import { useEffect, useState } from "react";
import { ShieldCheck, FolderOpen } from "lucide-react";
import MenuItemFolder from "./MenuItemFolder";
import FolderDropdownMenu from "./FolderDropdownMenu";
import spaceIcon from '@/assets/images/space.svg';
import AddFileDialog from "./AddFileDialog";
import useFileManagerStore from "@/stores/useFileManagerStore";
import MenuItemLoading from "./MenuItemLoading";

const MenuItemSpace = ({ space, className }) => {
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const spaces = useFileManagerStore((state) => state.spaces);

  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false); 
    } else {
      setLoading(true); 
      const timeoutId = setTimeout(() => setLoading(false), 500); 
      return () => clearTimeout(timeoutId); 
    }
  }, [spaces]);
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {space.is_private ? (
            <ShieldCheck size={20} className="fill-yellow-500 text-yellow-300 dark:fill-yellow-400 dark:text-yellow-300" />
          ) : (
            <img src={spaceIcon} alt="Space Icon" width={20} />
          )}
          <h4 className="text-sm font-medium text-black dark:text-white">
            {space.name}
          </h4>
        </div>
        <div className="flex gap-2">
          <AddFileDialog id={space?._id} type={space?.entity_type} />
          <FolderDropdownMenu />
        </div>
      </div>

      {loading ? (
        <MenuItemLoading text='Loading...' flex='row'/>
      ) : Array.isArray(space?.childs) && space?.childs?.length > 0 ? (
        space.childs.map(child => (
          <MenuItemFolder key={child._id} folder={child} className={className} />
        ))
      ) : (
        <div className="flex items-center justify-center flex-col gap-2 py-5">
          <FolderOpen className="text-gray-400 dark:text-white" />
          <p className="text-sm text-gray-400 dark:text-white">No folders available</p>
        </div>
      )}
    </>
  );
};

export default MenuItemSpace;