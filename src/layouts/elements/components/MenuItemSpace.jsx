import useGroupStore from "@/stores/useGroupStore";
import useFolderStore from "@/stores/useFolderStore";
import { 
  ShieldCheck,
  FolderOpen
} from "lucide-react";
import MenuItemFolder from "./MenuItemFolder";
import AddFolderDialog from "./AddFolderDialog";
import FolderDropdownMenu from "./FolderDropdownMenu";
import spaceIcon from '@/assets/images/space.svg';
import MenuItemLoading from "./MenuItemLoading";

const MenuItemSpace = ({ space, className }) => {
  const { getGroupSpaceId, loading: groupLoading } = useGroupStore(state => state);
  const { getFolderSpaceId, loading: folderLoading } = useFolderStore(state => state);

  const groups = getGroupSpaceId(space._id) || [];
  const folders = getFolderSpaceId(space._id) || [];

  const isLoading = groupLoading || folderLoading;  

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
          <AddFolderDialog spaceId={space._id} />
          <FolderDropdownMenu />
        </div>
      </div>

      {isLoading?.group ? (
        <MenuItemLoading/>
      ) : (
        <>
          {Array.isArray(folders) && folders.length > 0 ? (
            <>
              {Array.isArray(groups) && groups.map(group => (
                <MenuItemFolder key={group._id} folder={group} className={className} />
              ))}     
              {folders.map(folder => (
                <MenuItemFolder key={folder._id} folder={folder} className={className} />
              ))}
            </>
          ) : (
            <div className="flex items-center justify-center flex-col gap-2 py-5">
              <FolderOpen className="text-gray-400 dark:text-white" />
              <p className="text-sm text-gray-400 dark:text-white">No folders available</p>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default MenuItemSpace;
