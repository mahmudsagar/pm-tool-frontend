import { Separator } from "@/components/ui/separator";
import useSpaceStore from "@/stores/useSpaceStore";
import MenuItemLoading from "./components/MenuItemLoading";
import MenuItemSpace from "./components/MenuItemSpace";

const SidebarMenuItems = ({ className, setOpen }) => {
  const { spaceData, loading } = useSpaceStore(state => state);

  if (loading.space) {
    return <MenuItemLoading />;
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
