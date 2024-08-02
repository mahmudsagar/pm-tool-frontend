import { BookOpenCheck, LayoutDashboard } from "lucide-react";
export const NavItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    color: "text-sky-500",
  },
  {
    title: "Check",
    icon: LayoutDashboard,
    href: "/check",
    color: "text-sky-500",
  },
  {
    title: "Form",
    icon: LayoutDashboard,
    href: "/form/1",
    color: "text-sky-500",
  },
  {
    title: "Sheet",
    icon: LayoutDashboard,
    href: "/sheet",
    color: "text-sky-500",
    target: "_blank",
  },
  {
    title: "Document",
    icon: LayoutDashboard,
    href: "/document",
    color: "text-sky-500",
  },
  {
    title: "Form in Drawer",
    icon: LayoutDashboard,
    href: "/form/1",
    color: "text-sky-500",
    target: "_sidebar",
  },
  {
    title: "Settings",
    icon: BookOpenCheck,
    href: "/settings",
    color: "text-orange-500",
    isChidren: true,
    children: [
      {
        title: "Example-01",
        icon: BookOpenCheck,
        color: "text-red-500",
        href: "/settings/check",
      }
    ],
  },
];
