import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MenuEmpty from "./MenuEmpty";
import AddFileDialog from "./AddFileDialog";
import MenuItemFolder from "./MenuItemFolder";
import SpaceMenu from "./DropdownMenuItems/SpaceMenu";
import AddSpaceDialog from "./AddSpaceDialog";

import publicIcon from '@/assets/images/public.svg';
import privateIcon from '@/assets/images/private.svg';

const MenuItemSpace = ({
  space,
  className,
  showPinnedOnly = false,
  isRootSpace = false,
  spaceType = null,
  childSpaces = []
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // State to control folder expansion
  const navigate = useNavigate();

  // Handle proper display name for spaces
  const displayName = isRootSpace
    ? (spaceType === "private" ? "Private Space" : "Team Space")
    : space.name;

  // Handle navigation to filtered home page or space view
  const handleSpaceClick = () => {
    if (isRootSpace) {
      // For root spaces, navigate to home with the appropriate filter
      if (spaceType === 'private') {
        navigate('/?filter=private');
      } else {
        navigate('/?filter=team');
      }
    } else {
      // For specific spaces, navigate to space view to show contents
      navigate(`/space/${space._id}`);
    }
  };

  // Toggle expansion for root spaces and regular spaces
  const handleToggleExpansion = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Handle add button click
  const handleAddClick = (e) => {
    e.stopPropagation();
    setIsAddModalOpen(true);
  };

  // Determine if this space has children to show
  const hasChildren = isRootSpace
    ? childSpaces.length > 0
    : (Array.isArray(space?.childs) && space.childs.length > 0);

  return (
    <>
      <div key={space._id} className="flex items-center justify-between mb-3">
        <div className="flex gap-2 items-center">
          {/* Show chevron icon only if there are children */}
          {hasChildren && (
            <div className="flex items-center cursor-pointer" onClick={handleToggleExpansion}>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}

          <div className="flex gap-2 items-center cursor-pointer" onClick={handleSpaceClick}>
            {space.icon ? (
              <img src={space.icon} alt="Space Icon" width={20} height={20} className="rounded object-cover shrink-0" style={{ width: 20, height: 20 }} />
            ) : (
              <img src={space.is_private ? privateIcon : publicIcon} alt="Space Icon" width={20} />
            )}
            <h4 className="text-sm font-medium text-black dark:text-white hover:text-purple-600 transition-colors">
              {displayName}
            </h4>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Show appropriate dialog based on space type and nesting level */}
          {isRootSpace ? (
            <AddSpaceDialog
              id={space?._id}
              space_visibility={space.is_private}
              type={space?.entity_type}
              isOpen={isAddModalOpen}
              setIsOpen={setIsAddModalOpen}
            />
          ) : (
            <AddFileDialog
              id={space?._id}
              space_visibility={space.is_private}
              type={space?.entity_type}
              isOpen={isAddModalOpen}
              setIsOpen={setIsAddModalOpen}
            />
          )}

          {/* Space menu for options (only for non-root spaces) */}
          {!isRootSpace && (
            <SpaceMenu
              id={space?._id}
              type={space?.entity_type}
              initialData={space}
            />
          )}
        </div>
      </div>

      {/* Only show children when expanded */}
      {isExpanded && (
        <>
          {/* For root spaces, render child spaces from API */}
          {isRootSpace ? (
            childSpaces.length > 0 ? (
              childSpaces.map(childSpace => (
                <div key={childSpace._id} className="ml-6">
                  {/* If this child has entity_type "space", render it as a space */}
                  {childSpace.entity_type === "space" ? (
                    <MenuItemSpace
                      space={childSpace}
                      className={className}
                      showPinnedOnly={false}
                      isRootSpace={false}
                    />
                  ) : (
                    /* Otherwise render as folder/file */
                    <MenuItemFolder
                      folder={childSpace}
                      className={className}
                      showPinnedOnly={false}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="ml-6">
                <MenuEmpty />
              </div>
            )
          ) : (
            /* For non-root spaces, render their children directly */
            Array.isArray(space?.childs) && space?.childs.length > 0 ? (
              space.childs
                .sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return 0;
                })
                // When showPinnedOnly is true, only show pinned items
                .filter(child => !showPinnedOnly || child.pinned)
                .map(child => (
                  <div key={child._id} className="ml-6">
                    {child.entity_type === "space" ? (
                      <MenuItemSpace
                        space={child}
                        className={className}
                        showPinnedOnly={showPinnedOnly}
                        isRootSpace={false}
                      />
                    ) : (
                      <MenuItemFolder
                        folder={child}
                        className={className}
                        showPinnedOnly={showPinnedOnly}
                      />
                    )}
                  </div>
                ))
            ) : (
              <div className="ml-6">
                <MenuEmpty />
              </div>
            )
          )}
        </>
      )}
    </>
  );
};

export default MenuItemSpace;