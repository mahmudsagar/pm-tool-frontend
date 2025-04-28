import MenuEmpty from "./MenuEmpty";
import AddFileDialog from "./AddFileDialog";
import MenuItemFolder from "./MenuItemFolder";
import SpaceMenu from "./DropdownMenuItems/SpaceMenu";

import publicIcon from '@/assets/images/public.svg';
import PrivateIcon from '@/assets/images/private.svg';
import { useState } from "react";

const MenuItemSpace = ({ space, className, showPinnedOnly = false }) => {    
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  return (
    <>
      <div key={space._id} className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          { space.is_private ? <img src={PrivateIcon} alt="Space Icon" width={20} /> :  <img src={publicIcon} alt="Space Icon" width={20} /> }
          <h4 className="text-sm font-medium text-black dark:text-white">{space.name}</h4>
        </div>
        <div className="flex gap-2">
          <AddFileDialog id={space?._id} type={space?.entity_type} isOpen={isAddModalOpen} setIsOpen={setIsAddModalOpen}/>
          <SpaceMenu id={space?._id} type={space?.entity_type} isPinned={space?.pinned || false}/>
        </div>
      </div>

      { 
        Array.isArray(space?.childs) && space?.childs?.length > 0 ? (
          space.childs
            // When showPinnedOnly is true, only show items that belong to this space
            .filter(child => !showPinnedOnly || (child.pinned && child.space_id === space._id))
            .map(child => 
              <MenuItemFolder 
                key={child._id} 
                folder={child} 
                className={className}
                showPinnedOnly={showPinnedOnly}
              />
            )
        ) : (
          <MenuEmpty/>
        )
      }
    </>
  );
};

export default MenuItemSpace;