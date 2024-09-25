
import Link from "@/BetterRouter/Link";
import { useEffect, useState } from "react";
import { useSidebar } from "@/stores/store";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import {
  Button,
  buttonVariants
} from "@/components/ui/button";
import {
  ChevronDownIcon,
  ShieldCheck,
  Plus,
  EllipsisVertical,
  File,
  FolderClosed,
  FolderOpen
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./subnav-accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import useFolderStore from "@/stores/folderStore";
import { Skeleton } from "@/components/ui/skeleton";

const SidebarMenuItems = ({ className, setOpen }) => {
  const path = useLocation().pathname;
  const { isOpen } = useSidebar();
  const [openItem, setOpenItem] = useState("");
  const [lastOpenItem, setLastOpenItem] = useState("");
  const [dropdownOpenStates, setDropdownOpenStates] = useState({});
  const { spaceData, getFolderSpaceId, loading, error } = useFolderStore(state => state);

  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
  }, [isOpen]);

  const handleDropdownToggle = (id) => {
    setDropdownOpenStates((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  return (
    <>
      {loading.space &&
        <>
          <div className="flex items-center justify-center gap-2 flex-col">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-[210px] h-8" />
            <Skeleton className="w-[210px] h-8" />
            <Skeleton className="w-[210px] h-8" />
            <Skeleton className="w-[210px] h-8" />
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-center gap-2 flex-col">
            <Skeleton className="w-full h-8" />
            <Skeleton className="w-[210px] h-8" />
            <Skeleton className="w-[210px] h-8" />
            <Skeleton className="w-[210px] h-8" />
            <Skeleton className="w-[210px] h-8" />
          </div>
        </>
      }
      {!loading.space && spaceData?.map((space, index) => (
        <div key={index} className="block mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              {space.is_private ? (
                <ShieldCheck size={20} className="fill-yellow-500 text-yellow-300 dark:fill-yellow-400 dark:text-yellow-300" />
              ) : (
                <FolderClosed size={20} className="fill-yellow-500 text-yellow-300 dark:fill-yellow-400 dark:text-yellow-300" />
              )}
              <h4 className="text-sm font-medium text-black dark:text-white">{space.name}</h4>
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
          {Array.isArray(getFolderSpaceId(space._id)) && getFolderSpaceId(space._id).length > 0 ?
            getFolderSpaceId(space._id).map((folderItem, index) => (
              <div key={index} className="pl-2">
                <Accordion
                  type="single"
                  collapsible
                  className="space-y-2"
                  value={openItem}
                  onValueChange={setOpenItem}
                >
                  <AccordionItem value={folderItem._id} className="border-none ">
                    <AccordionTrigger
                      className={cn(
                        'group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline',
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <File size={18} className={cn('inline group-hover:hidden group-data-[state=open]:hidden')} />
                        <ChevronDownIcon
                          strokeWidth={2.5}
                          size={20}
                          className={cn(
                            'hidden group-hover:inline group-data-[state=open]:inline shrink-0 transition-transform duration-200',
                            { 'inline': openItem === folderItem._id }
                          )}
                        />

                        <div className={cn('absolute left-10 text-sm duration-200', !isOpen && className,)}>
                          {folderItem.name}
                        </div>
                      </div>

                      {/* Always render Plus and EllipsisVertical icons, but control their visibility */}
                      <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${openItem === folderItem._id ? 'opacity-100' : ''}`}>
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
                                  This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                </DialogDescription>
                              </DialogHeader>
                            </DialogContent>
                          </Dialog>
                          <DropdownMenu open={dropdownOpenStates[folderItem._id]} onOpenChange={() => handleDropdownToggle(folderItem._id)}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6" onClick={(e) => e.stopPropagation()}>
                                <EllipsisVertical
                                  size={16}
                                  className={cn(
                                    'text-slate-500 hover:text-black dark:text-white dark:hover:text-black',
                                    dropdownOpenStates[folderItem._id] ? 'opacity-100' : 'opacity-100'
                                  )}
                                />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} >
                              <DropdownMenuItem>
                                <Link>Delete</Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pl-6 py-3">
                      <p className="text-center">Empty</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )) :
            <div className="flex items-center justify-center flex-col gap-2 py-5">
              <FolderOpen className="text-gray-400 dark:text-white" />
              <p className="text-sm text-gray-400 dark:text-white" >{getFolderSpaceId(space._id)}</p>
            </div>
          }
          {index !== spaceData.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </>
  );
};

export default SidebarMenuItems;