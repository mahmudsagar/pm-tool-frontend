import { Separator } from "@/components/ui/separator";
import useFileManagerStore from "@/stores/useFileManagerStore";
import MenuItemLoading from "./components/MenuItemLoading";
import MenuItemSpace from "./components/MenuItemSpace";

const SidebarMenuItems = ({ className, setOpen }) => {
  const { spaces, loading } = useFileManagerStore(state => state);  

  if (loading) {
    return <MenuItemLoading text='Loading' flex='col' />;
  }

  return (
    <>
      {!loading && spaces?.map((space, index) => (
        <div key={index} className="block mb-5">
          <MenuItemSpace space={space} className={className} />
          {index !== spaces.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </>
  );
};

export default SidebarMenuItems;
