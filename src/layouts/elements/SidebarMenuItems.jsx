import { useEffect } from "react";
import useApi from "@/lib/dataFetcher";
import { baseUrl, userID } from '@/utils/constants';
import { Separator } from "@/components/ui/separator";
import useFileManagerStore from "@/stores/useFileManagerStore";
import MenuItemLoading from "./components/MenuItemLoading";
import MenuItemSpace from "./components/MenuItemSpace";

const SidebarMenuItems = ({ className, setOpen }) => {
  const { loading, data, callApi } = useApi();
  const { formatSpaces, publicSpaces, privateSpaces } = useFileManagerStore(state => state);
  
  useEffect(() => {
    callApi(baseUrl + '/v1/space?user_id=' + userID);
  }, []); 

  useEffect(() => {
    formatSpaces(data);
  }, [data]);  
 
  if (loading) {
    return <MenuItemLoading text='Loading...' flex='col' />;
  }

  return (
    <>
      { !loading &&
        <div className="block mb-5">
          { Array.isArray(data) && data?.length > 0 ? (
            <>
              { privateSpaces?.map( space => (
                <MenuItemSpace 
                  key={space._id} 
                  space={space} 
                  className={className} 
                />
              ))}

              <Separator className="my-4" />
              
              { publicSpaces?.map( space => (
                <MenuItemSpace 
                  key={space._id} 
                  space={space} 
                  className={className} 
                />
              ))}
            </>
          ) : (
            <p>It seems that something went wrong. Please try again.</p>
          )}          
        </div>
      }
    </>
  );
};

export default SidebarMenuItems;
