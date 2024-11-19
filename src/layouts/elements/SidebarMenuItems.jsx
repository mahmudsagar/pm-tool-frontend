import { Separator } from "@/components/ui/separator";
import useFileManagerStore from "@/stores/useFileManagerStore";
import MenuItemLoading from "./components/MenuItemLoading";
import MenuItemSpace from "./components/MenuItemSpace";

const SidebarMenuItems = ({ className, setOpen }) => {
  const { publicSpaces, privateSpaces } = useFileManagerStore(state => state);

  return (
    <>
      { (publicSpaces || privateSpaces) &&
        <div className="block mb-5">
          { publicSpaces?.length > 0 && privateSpaces?.length > 0 ? (
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
            <MenuItemLoading text='Loading...' flex='col' />
          )}          
        </div>
      }
    </>
  );
};

export default SidebarMenuItems;
