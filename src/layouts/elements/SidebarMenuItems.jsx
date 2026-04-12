import { Separator } from "@/components/ui/separator";
import useFileManagerStore from "@/stores/useFileManagerStore";
import useAuthStore from "@/stores/useAuthStore";
import MenuItemSpace from "./components/MenuItemSpace";
import MenuLoading from "./components/MenuLoading";

// Define default root spaces as static configurations
const defaultPrivateSpace = {
  _id: "private-root", // Use a fixed ID for referencing
  description: "A private workspace for personal use",
  entity_type: "space",
  is_default: true,
  is_private: true,
  name: "Private Space"
};

const defaultTeamSpace = {
  _id: "team-root", // Use a fixed ID for referencing
  description: "A public workspace for collaboration",
  entity_type: "space",
  is_default: true,
  is_private: false,
  name: "Team Space"
};

const SidebarMenuItems = ({ className }) => {
  // Get spaces and loading state from store
  const {
    publicSpaces,
    privateSpaces,
    isSpacesLoading,
    hasInitializedSpaces
  } = useFileManagerStore(state => state);
  const isOwner = useAuthStore(state => state.isOwner)();

  // console.log("🚀 ~ SidebarMenuItems ~ publicSpaces:", publicSpaces);
  // console.log("🚀 ~ SidebarMenuItems ~ privateSpaces:", privateSpaces);
  // Show loading only if we haven't initialized spaces yet and are currently loading
  if (isSpacesLoading && !hasInitializedSpaces) {
    return (
      <div className="block mb-5">
        <MenuLoading />
      </div>
    );
  }

  // Sort items from API to ensure pinned items appear at top
  const sortedPrivateSpaces = [...(privateSpaces || [])].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const sortedPublicSpaces = [...(publicSpaces || [])].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  // Always show the default spaces, even if no API spaces are loaded
  return (
    <div className="block mb-5">
      {/* Private Space - Only visible to workspace owners */}
      {isOwner && (
        <>
          <MenuItemSpace
            key={defaultPrivateSpace._id}
            space={defaultPrivateSpace}
            isRootSpace={true}
            spaceType="private"
            className={className}
            // Pass all private spaces as children of this root space
            childSpaces={sortedPrivateSpaces}
          />
          <Separator className="my-4" />
        </>
      )}
      {/* Team Space - Static root with dynamic children */}
      <MenuItemSpace
        key={defaultTeamSpace._id}
        space={defaultTeamSpace}
        isRootSpace={true}
        spaceType="team"
        className={className}
        // Pass all public spaces as children of this root space
        childSpaces={sortedPublicSpaces}
      />
    </div>
  );
};

export default SidebarMenuItems;