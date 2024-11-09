import { cn } from "@/lib/utils";
import Link from "@/BetterRouter/Link";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LucideCalendar,
  LucideHome,
  LucideInbox,
} from "lucide-react";
import { CommandMenu } from "@/components/elements/commandMenu/command-menu";
import SidebarMenuItems from "./SidebarMenuItems";
import { useSidebar } from "@/stores/store";
import useFileManagerStore from "@/stores/useFileManagerStore";

const sidebarTopLinks = [
  {
    title: "Home",
    href: "/",
    icon: LucideHome,
  },
  {
    title: "Calendar",
    href: "/check",
    icon: LucideCalendar,
  },
  {
    title: "Inbox",
    href: "/form/1",
    icon: LucideInbox,
  },
];

export function SidebarMenu({ setOpen, className }) {
  const path = useLocation().pathname;
  const { isOpen } = useSidebar();
  const [openItem, setOpenItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastOpenItem, setLastOpenItem] = useState("");
  const { fetchSpace, spaces } = useFileManagerStore(state => state);
  

  useEffect(() => {
    if (isOpen) {
      setOpenItem(lastOpenItem);
    } else {
      setLastOpenItem(openItem);
      setOpenItem("");
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        await fetchSpace();
        setLoading(false);      
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchSpace, spaces]);  


  return (
    <nav className="space-y-4 h-full">
      <CommandMenu />
      <div className="flex justify-between my-2">
        {sidebarTopLinks.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn("bg-slate-100 dark:bg-transparent dark:border text-slate-500 rounded-lg py-2 px-6",
              path === item.href ? "text-purple-600 bg-purple-50" : "")}>
            <item.icon />
          </Link>
        ))}
      </div>
      <div className="space-y-2 pt-5 pb-6 h-[calc(100%_-_80px)] overflow-y-auto better-scrollbar">
        <p className="text-xs font-medium text-slate-500 pb-3 dark:text-white">Spaces</p>
        {/* Menu start */}
        <SidebarMenuItems setOpen={setOpen} className={className} loading={loading} />
      </div>
    </nav>
  );
}
