
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./subnav-accordion";
import { ChevronDownIcon, MoreVertical } from "lucide-react";
import Link from "@/BetterRouter/Link";
import { useEffect, useState } from "react";
import { useSidebar } from "@/stores/store";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
const SidebarMenuItems = ({ items, className, setOpen }) => {
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
    <>
      {items.map((item, index) =>
        item?.type === "group" ?
          <div key={item.title} className="block mb-5">
            <div className="flex gap-2 mb-3">
              {item.icon && <item.icon size={18} className="text-black dark:text-white" />}
              <h4 className="text-sm font-medium text-black dark:text-white">{item.title}</h4>
            </div>
            <div className="pl-2">
              <SidebarMenuItems items={item.items} className={className} setOpen={setOpen} />
            </div>
            {index < items.length - 1 && <Separator className="my-4" />}
          </div>
          :
          item.isChildren ? (
            <Accordion
              type="single"
              collapsible
              className="space-y-2"
              key={item.title}
              value={openItem}
              onValueChange={setOpenItem}
            >
              <AccordionItem value={item.title} className="border-none ">
                <AccordionTrigger
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'group relative flex h-9 justify-between px-4 py-2 text-black dark:text-white duration-200 hover:bg-muted hover:no-underline',
                  )}
                >
                  <div className="flex justify-between items-center">
                    <item.icon size={18} className={cn(item.color, 'inline group-hover:hidden group-data-[state=open]:hidden')} />
                    {isOpen && (
                      <ChevronDownIcon strokeWidth={2.5} size={20} className="hidden group-hover:inline group-data-[state=open]:inline shrink-0 transition-transform duration-200" />
                    )}

                    <div
                      className={cn(
                        'absolute left-10 text-sm duration-200',
                        !isOpen && className,
                      )}
                    >
                      {item.title}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100">
                    {item.actionItemDropdowns && (
                      <div className="flex gap-1">
                        {item.actionItemDropdowns.map((actionItem, index) => <DropdownMenu key={index}>
                          <DropdownMenuTrigger asChild >
                            <Button variant="ghost" size="icon" className="hover:bg-slate-300 w-6 h-6">
                              {actionItem?.icon && <actionItem.icon className="h-4 w-4" />}
                              {actionItem?.title && <span className="pl-2">{actionItem.text}</span>}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actionItem?.items?.map((item, index) => (
                              <DropdownMenuItem key={index}>
                                <Link href={item.href}>{item.title}</Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </div>
                    )}
                  </div>

                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pb-1 pl-6">
                  {item.children?.map((child) => (
                    <Link
                      key={child.title}
                      href={child.href}
                      onClick={() => {
                        if (setOpen) setOpen(false)
                      }}
                      className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'group relative flex h-9 justify-start gap-x-3 text-slate-700 dark:text-slate-200',
                        path === child.href &&
                        'bg-slate-50 dark:bg-slate-800'
                      )}
                    >
                      <child.icon size={16} />
                      <div
                        className={cn(
                          'absolute left-10 text-xs duration-200',
                          !isOpen && className,
                        )}
                      >
                        {child.title}
                      </div>
                    </Link>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <Link
              key={item.title}
              href={item.href}
              target={item.target || "_self"}
              onClick={() => {
                if (setOpen) setOpen(false)
              }}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'group relative flex h-9 justify-start text-black font-medium dark:text-white',
                path === item.href && 'bg-slate-50 dark:bg-slate-800',
              )}
            >
              <item.icon size={18} className={cn(item.color)} />
              <span
                className={cn(
                  'absolute left-10 text-sm duration-200',
                  !isOpen && className,
                )}
              >
                {item.title}
              </span>
            </Link>
          ),
      )}
    </>
  );
};

export default SidebarMenuItems;