import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebar } from "./mobile-sidebar";
// import DynamicBreadCrumb from "@/components/elements/breadcrumbs";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Header({ showPageTitle = true, closeBtn='', topMenu }) {

    return (
        <div className="supports-backdrop-blur:bg-background/60 sticky left-0 right-0 top-0 z-20 border-b bg-background/95 backdrop-blur">
            <nav className="flex h-16 items-center justify-between px-4 md:px-6 pr-2 md:pr-2">
                {closeBtn}
                {showPageTitle ? <div className="hidden md:block">
                    <h3 className="text-base font-semibold">Better Notion</h3>
                    {/* <DynamicBreadCrumb /> */}
                </div> : <div className="hidden md:block"> </div>}

               {showPageTitle && <div className={cn("block md:!hidden")}>
                    <MobileSidebar />
                </div>}

                <div className="flex items-center gap-3">


                    {/* <div className="max-w-20 flex mr-3.5 flex-row-reverse justify-end items-center relative transform translate-z-0">
                        <Avatar className="w-8 h-8 relative -mr-3.5">
                            <AvatarImage src="https://avatars.githubusercontent.com/u/124598.png" alt="@shadcn" />
                            <AvatarFallback>PP</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-8 h-8 relative -mr-3.5">
                            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                            <AvatarFallback>user</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-8 h-8 relative -mr-3.5">
                            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                            <AvatarFallback>user</AvatarFallback>
                        </Avatar>
                    </div> */}

                    <div className="flex gap-0 items-center justify-between">
                       {topMenu?.inlineContent}
                        <ThemeToggle />
                       {topMenu?.dropdownContent && <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-6">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">More</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {topMenu?.dropdownContent}
                            </DropdownMenuContent>
                        </DropdownMenu>}

                    </div>
                </div>
            </nav>
        </div>
    );
}