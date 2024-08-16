
import { buttonVariants } from "@/components/ui/button";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./subnav-accordion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "@/BetterRouter/Link";
import { useLocation } from "react-router-dom";
import { ChevronDownIcon, LucideCalendar, LucideHome, LucideInbox } from "lucide-react";
import { useSidebar } from "@/stores/store";
import { CommandMenu } from "@/components/elements/commandMenu/command-menu";

const sidebarTopLinks = [
  {
    title: "Home",
    href: "/",
    icon: LucideHome,
    className: "bg-slate-100 dark:bg-transparent dark:border text-slate-500 dark:text-slate-400 rounded-lg py-2 px-6",
  },
  {
    title: "Calendar",
    href: "/check",
    icon: LucideCalendar,
    className: "bg-slate-100 dark:bg-transparent dark:border text-slate-500 dark:text-slate-400 rounded-lg py-2 px-6",
  },
  {
    title: "Inbox",
    href: "/form/1",
    icon: LucideInbox,
    className: "bg-slate-100 dark:bg-transparent dark:border text-slate-500 dark:text-slate-400 rounded-lg py-2 px-6",
  },
];

export function SideNav({ items, setOpen, className }) {
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
            className={cn(item.className, path === item.href ? "visited:text-purple-600 visited:bg-purple-50" : "")}>
            <item.icon />
          </Link>
        ))}
      </div>
      <div className="space-y-2 pt-5 pb-6 h-[calc(100%_-_80px)] overflow-y-auto better-scrollbar">
        {items.map((item) =>
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
                  <item.icon size={18} className={cn(item.color, 'inline group-hover:hidden group-data-[state=open]:hidden')} />

                  {isOpen && (
                    <ChevronDownIcon size={20} className="hidden group-hover:inline group-data-[state=open]:inline shrink-0 transition-transform duration-200" />
                  )}

                  <div
                    className={cn(
                      'absolute left-10 text-sm duration-200',
                      !isOpen && className,
                    )}
                  >
                    {item.title}
                  </div>

                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pb-1">
                  {item.children?.map((child) => (
                    <Link
                      key={child.title}
                      href={child.href}
                      onClick={() => {
                        if (setOpen) setOpen(false)
                      }}
                      className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'group relative flex h-9 justify-start gap-x-3 text-slate-700',
                        path === child.href &&
                        'bg-muted font-bold'
                      )}
                    >
                      <child.icon size={18} className="text-slate-500" />
                      <div
                        className={cn(
                          'absolute left-10 text-sm duration-200',
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
                'group relative flex h-9 justify-start text-black dark:text-white',
                path === item.href && 'bg-slate-50 dark:bg-slate-800 font-medium',
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
      </div>
    </nav>
  );
}
