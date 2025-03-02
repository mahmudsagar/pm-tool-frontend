import { Separator } from "@/components/ui/separator";
import useFileManagerStore from "@/stores/useFileManagerStore";
import MenuItemSpace from "./components/MenuItemSpace";
import MenuLoading from "./components/MenuLoading";

const SidebarMenuItems = ({ className }) => {
  const { publicSpaces, privateSpaces } = useFileManagerStore(state => state);   

  return (
    <div className="block mb-5">
      { publicSpaces?.length > 0 || privateSpaces?.length > 0 ? (
        <>
          { privateSpaces?.map( space => (
            <MenuItemSpace key={space._id} space={space} className={className} />
          ))}

          <Separator className="my-4" />
          
          { publicSpaces?.map( space => (
            <MenuItemSpace key={space._id} space={space} className={className} />
          ))}
        </>
      ) : (
        <MenuLoading/>
      )}          
    </div>
  );
};

export default SidebarMenuItems;
