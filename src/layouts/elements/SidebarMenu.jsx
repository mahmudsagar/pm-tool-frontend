

import { cn } from "@/lib/utils";
import Link from "@/BetterRouter/Link";
import { useLocation } from "react-router-dom";
import { LucideCalendar, LucideHome, LucideInbox } from "lucide-react";
import { CommandMenu } from "@/components/elements/commandMenu/command-menu";
import SidebarMenuItems from "./SidebarMenuItems";

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
        <SidebarMenuItems items={items} setOpen={setOpen} className={className} />
      </div>
    </nav>
  );
}
