import { Separator } from "@/components/ui/separator";
import useFolderStore from "@/stores/folderStore";
import MenuItemSkeleton from "./components/MenuItemSkeleton";
import MenuItemSpace from "./components/MenuItemSpace";

const SidebarMenuItems = ({ className, setOpen }) => {
  const { spaceData, loading } = useFolderStore(state => state);

  if (loading.space) {
    return <MenuItemSkeleton />;
  }

  return (
    <>
      {!loading.space && spaceData?.map((space, index) => (
        <div key={index} className="block mb-5">
          <MenuItemSpace space={space} className={className} />
          {index !== spaceData.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </>
  );
};

export default SidebarMenuItems;
