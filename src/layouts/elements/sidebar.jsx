import { useEffect } from "react";
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
  const { isOpen } = useSidebar();
  const { data: users, callApi: userCallApi } = useApi();
  const { data: spaces, callApi: spaceCallApi } = useApi();
  const { logout, user, loading: authLoading } = useAuth();
  // console.log("🚀 ~ Sidebar ~ user:", user)allChildFiles
  const {
    storeState,
    formatSpaces,
    hasInitializedSpaces,
    setInitializedSpaces,
    isSpacesLoading,
    setSpacesLoading,
    resetInitialization,
  } = useFileManagerStore(state => state);

  useEffect(() => {
    // Reset spaces if user is null (logout scenario)
    if (!user && hasInitializedSpaces) {
      resetInitialization();
      return;
    }

    // Load spaces when user is available, auth is not loading, and spaces aren't already loading
    if (user?._id && !authLoading && !isSpacesLoading) {
      // Always reload spaces when user is available to ensure fresh data on page reload
      // console.log("Loading spaces for user:", user._id, "Initialized:", hasInitializedSpaces);
      
      if (!hasInitializedSpaces) {
        setSpacesLoading(true);

        // Always fetch users data first
        userCallApi(baseUrl + '/v1/user');

        // Then fetch spaces for the authenticated user
        spaceCallApi(baseUrl + '/v1/space?user_id=' + user._id);
        
        // Mark as initialized
        setInitializedSpaces(true);
      }
    }
  }, [user, authLoading, hasInitializedSpaces, isSpacesLoading, userCallApi, spaceCallApi, setInitializedSpaces, setSpacesLoading, resetInitialization]);

  // Handle users data
  useEffect(() => {
    if (users) {
      storeState('users', users);
    }
  }, [users, storeState]);
  useEffect(() => {
    if (spaces) {
      formatSpaces(spaces);
    }
  }, [spaces, formatSpaces]);

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
                  {/* Optional: Show loading indicator for new users */}
                  {isSpacesLoading && (
                    <span className="text-xs text-muted-foreground">Setting up workspace...</span>
                  )}
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