import useFolderStore from "@/stores/folderStore";
import { ShieldCheck, FolderClosed, FolderOpen } from "lucide-react";
import MenuItemFolder from "./MenuItemFolder";
import AddFolderDialog from "./AddFolderDialog";
import FolderDropdownMenu from "./FolderDropdownMenu";

const MenuItemSpace = ({ space }) => {
  const { getFolderSpaceId } = useFolderStore(state => state);
  const folders = getFolderSpaceId(space._id);
  
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {space.is_private ? (
            <ShieldCheck size={20} className="fill-yellow-500 text-yellow-300 dark:fill-yellow-400 dark:text-yellow-300" />
          ) : (
            <FolderClosed size={20} className="fill-yellow-500 text-yellow-300 dark:fill-yellow-400 dark:text-yellow-300" />
          )}
          <h4 className="text-sm font-medium text-black dark:text-white">
            {space.name}
          </h4>
        </div>
        <div className="flex gap-2">
          <AddFolderDialog spaceId={space._id} />
          <FolderDropdownMenu />
        </div>
      </div>
      {Array.isArray(folders) && folders.length > 0 ?
        folders.map(folder => (
          <MenuItemFolder key={folder._id} folder={folder} />
        )) :
        <div className="flex items-center justify-center flex-col gap-2 py-5">
          <FolderOpen className="text-gray-400 dark:text-white" />
          <p className="text-sm text-gray-400 dark:text-white" >{folders}</p>
        </div>
      }
    </>
  )
}

export default MenuItemSpace