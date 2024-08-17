import { BookOpenCheck, LayoutDashboard } from "lucide-react";
export const NavItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Check",
    icon: LayoutDashboard,
    href: "/check",
  },
  {
    title: "Form",
    icon: LayoutDashboard,
    href: "/form/1",
  },
  {
    title: "Sheet",
    icon: LayoutDashboard,
    href: "/sheet",
    target: "_blank",
  },
  {
    title: "Document",
    icon: LayoutDashboard,
    href: "/document",
  },
  {
    title: "Form in Drawer",
    icon: LayoutDashboard,
    href: "/form/1",
    target: "_sidebar",
  },
  {
    title: "Settings",
    icon: BookOpenCheck,
    href: "/settings",
    isChildren: true,
    children: [
      {
        title: "Example-01",
        icon: BookOpenCheck,
        href: "/settings/check",
      }
    ],
  },
];
