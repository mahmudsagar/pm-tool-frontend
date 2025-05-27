import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { SidebarMenu } from "./SidebarMenu";
import { useSidebar } from "@/stores/store";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "@/BetterRouter/Link";
import useApi from "@/lib/dataFetcher";
import { baseUrl } from '@/utils/constants';
import useFileManagerStore from "@/stores/useFileManagerStore";
import { useAuth } from "@/contexts/AuthContext";

export default function Sidebar({ className }) {
  const { isOpen, toggle } = useSidebar();
  const [status, setStatus] = useState(false);
  const { data: users, callApi: userCallApi } = useApi();
  const { data: spaces, callApi: spaceCallApi } = useApi();
  const { logout, user } = useAuth();

  const {
    storeState,
    publicSpaces,
    privateSpaces,
    formatSpaces,
    hasInitializedSpaces, // Add this flag to track if spaces have been loaded
    setInitializedSpaces, // Add this method to set the flag
  } = useFileManagerStore(state => state);

  useEffect(() => {
    // Only call space API if we haven't initialized spaces yet and user exists
    // This prevents unnecessary API calls for static default spaces
    if (user && !hasInitializedSpaces) {
      spaceCallApi(baseUrl + '/v1/space?user_id=' + user._id);
      userCallApi(baseUrl + '/v1/user');
      setInitializedSpaces(true); // Mark as initialized after first load
    }
  }, [user, hasInitializedSpaces, spaceCallApi, userCallApi, setInitializedSpaces]);

  useEffect(() => {
    if (spaces && users) {
      storeState('users', users);
      formatSpaces(spaces);
    }
  }, [spaces, users, formatSpaces, storeState]);

  const handleToggle = () => {
    setStatus(true);
    toggle();
    setTimeout(() => setStatus(false), 500);
  };

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
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>user</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col justify-center">
                  <h5 className="text-xs font-semibold">{user?.name ? user.name : user?.email}</h5>
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
                  <DropdownMenuItem>
                    <Button variant="ghost" size="xs" onClick={logout}>
                      Logout
                    </Button>
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