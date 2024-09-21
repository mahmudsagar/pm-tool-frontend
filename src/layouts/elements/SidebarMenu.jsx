

import { cn } from "@/lib/utils";
import Link from "@/BetterRouter/Link";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import {
  LucideCalendar,
  LucideHome,
  LucideInbox,
  ShieldCheck,
  Plus,
  EllipsisVertical,
  ChevronDownIcon,
  File
} from "lucide-react";
import { CommandMenu } from "@/components/elements/commandMenu/command-menu";
import SidebarMenuItems from "./SidebarMenuItems";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./subnav-accordion";
import { useSidebar } from "@/stores/store";

const sidebarTopLinks = [
  {
    title: "Home",
    href: "/",
    icon: LucideHome,
    className: "bg-slate-100 dark:bg-transparent dark:border text-slate-500  rounded-lg py-2 px-6",
  },
  {
    title: "Calendar",
    href: "/check",
    icon: LucideCalendar,
    className: "bg-slate-100 dark:bg-transparent dark:border text-slate-500  rounded-lg py-2 px-6",
  },
  {
    title: "Inbox",
    href: "/form/1",
    icon: LucideInbox,
    className: "bg-slate-100 dark:bg-transparent dark:border text-slate-500  rounded-lg py-2 px-6",
  },
];

export function SidebarMenu({ items, setOpen, className }) {
  const path = useLocation().pathname;
  const { isOpen } = useSidebar();
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
  }, [isOpen]);


  return (
    <nav className="space-y-4 h-full">
      <CommandMenu />
      <div className="flex justify-between my-2">
        {sidebarTopLinks.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn(item.className, path === item.href ? "text-purple-600 bg-purple-50" : "")}>
            <item.icon />
          </Link>
        ))}
      </div>
      <div className="space-y-2 pt-5 pb-6 h-[calc(100%_-_80px)] overflow-y-auto better-scrollbar">
        <p className="text-xs font-medium text-slate-500 pb-3 dark:text-white">Spaces</p>
        {/* Menu start */}
        <div className="block mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <ShieldCheck size={20} className="fill-yellow-500 text-yellow-300 dark:fill-yellow-400 dark:text-yellow-300" />
              <h4 className="text-sm font-medium text-black dark:text-white">Private</h4>
            </div>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger>
                  <Button variant="ghost" size="icon" className="group hover:bg-slate-300 w-6 h-6">
                    <Plus size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6">
                    <EllipsisVertical size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Billing</DropdownMenuItem>
                  <DropdownMenuItem>Team</DropdownMenuItem>
                  <DropdownMenuItem>Subscription</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="pl-2">
            <Accordion
              type="single"
              collapsible
              className="space-y-2"
              value={openItem}
              onValueChange={setOpenItem}
            >
              <AccordionItem value='settings' className="border-none ">
                <AccordionTrigger
                  className={cn(
                    'group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline',
                  )}
                >
                  <div className="flex justify-between items-center">
                    <File size={18} className={cn('inline group-hover:hidden group-data-[state=open]:hidden')} />
                    {isOpen && (
                      <ChevronDownIcon strokeWidth={2.5} size={20} className="hidden group-hover:inline group-data-[state=open]:inline shrink-0 transition-transform duration-200" />
                    )}

                    <div
                      className={cn(
                        'absolute left-10 text-sm duration-200',
                        !isOpen && className,
                      )}
                    >
                      settings
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100">
                    <div className="flex gap-1">
                      <Dialog>
                        <DialogTrigger>
                          <Button variant="ghost" size="icon" className="group hover:bg-slate-300 w-6 h-6">
                            <Plus size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will permanently delete your account
                              and remove your data from our servers.
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild >
                          <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6">
                            <EllipsisVertical size={16} className="text-slate-500 hover:text-black dark:text-white dark:hover:text-black" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem >
                            <Link>fdgdfg</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pb-1 pl-6">
                  sdadsfasdf
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <Separator className="my-4" />
        </div>
        <SidebarMenuItems items={items} setOpen={setOpen} className={className} />
      </div>
    </nav>
  );
}
