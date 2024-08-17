import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { SideNav } from "./side-nav";
import { NavItems } from "./constants/side-nav";
import { useSidebar } from "@/stores/store";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "@/BetterRouter/Link";


export default function Sidebar({ className }) {
  const { isOpen, toggle } = useSidebar();
  const [status, setStatus] = useState(false);

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
      {/* <ArrowLeft
        className={cn(
          "absolute -right-3 top-20 cursor-pointer rounded-full border bg-background text-3xl text-foreground",
          !isOpen && "rotate-180"
        )}
        onClick={handleToggle}
      /> */}
      <div className="py-4 h-full">
        <div className="px-4 h-full flex flex-col justify-between">
          <div className="font-inter h-5/6">
            <SideNav
              className="h-full text-background opacity-0 transition-all duration-300 group-hover:z-50 group-hover:ml-4 group-hover:rounded group-hover:bg-foreground group-hover:p-2 group-hover:opacity-100"
              items={NavItems}
            />
          </div>
          <div className="border-t pt-2">
            {/* <Separator className="my-4" /> */}
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
