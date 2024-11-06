import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { SidebarMenu } from "./SidebarMenu";
import { useSidebar } from "@/stores/store";
import useGroupStore from "@/stores/useGroupStore";
import useSpaceStore from "@/stores/useSpaceStore";
import useFolderStore from "@/stores/useFolderStore";
import useDocumentStore from "@/stores/useDocumentStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "@/BetterRouter/Link";


export default function Sidebar({ className }) {
  const { isOpen, toggle } = useSidebar();
  const [status, setStatus] = useState(false);
  const { fetchSpaceData } = useSpaceStore(state => state);
  const { fetchGroupData } = useGroupStore(state => state);
  const { fetchFolderData } = useFolderStore(state => state);
  const { fetchDocumentData } = useDocumentStore(state => state);
  
  const handleToggle = () => {
    setStatus(true);
    toggle();
    setTimeout(() => setStatus(false), 500);
  };

  useEffect(() => {
    const callApi = async () => {
      try {
        await fetchSpaceData();
        
        await Promise.all([fetchGroupData(), fetchFolderData(), fetchDocumentData()]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    callApi();
  }, [fetchSpaceData, fetchGroupData, fetchFolderData, fetchDocumentData]);

  return (
    <nav
      className={cn(
        `relative hidden h-screen border-r md:block font-inter`,
        status && "duration-500",
        isOpen ? "w-[272px]" : "w-[78px]",
        className
      )}
    >
      <div className="py-4 h-full">
        <div className="px-4 h-full flex flex-col justify-between">
          <div className="font-inter h-5/6">
            <SidebarMenu
              className="h-full text-background opacity-0 transition-all duration-300 group-hover:z-50 group-hover:ml-4 group-hover:rounded group-hover:bg-foreground group-hover:p-2 group-hover:opacity-100"
            />
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <div className="flex gap-1.5">
                <div className="w-12 flex flex-row-reverse justify-end items-center relative transform translate-z-0">
                  <Avatar className="w-8 h-8 relative -mr-3.5">
                    <AvatarImage src="https://avatars.githubusercontent.com/u/124598.png" alt="@shadcn" />
                    <AvatarFallback>PP</AvatarFallback>
                  </Avatar>
                  <Avatar className="w-8 h-8 relative -mr-3.5">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>user</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h5 className="text-xs font-semibold">User Name</h5>
                  <span className="text-slate-600 dark:text-slate-100 text-xs">Chief Technology Officer</span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Link href="/">Profile</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
