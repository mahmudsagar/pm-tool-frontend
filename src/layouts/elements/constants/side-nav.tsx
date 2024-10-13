import {
  BookOpenCheck,
  Component,
  DockIcon,
  FormInput,
  LayoutDashboard,
  MoreVertical,
  Plus,
  Sheet,
  ShieldQuestion,
  UserRoundCheck,
  File,
} from "lucide-react";
export const NavItems = [
  {
    title: "Main",
    icon: Component,
    type: "group",
    items: [
      {
        title: "Dashboard",
        icon: ShieldQuestion,
        href: "/",
        target: "_self",
      },
      {
        title: "Check",
        icon: UserRoundCheck,
        href: "/check",
        target: "_self",
      },
      {
        title: "Form",
        icon: FormInput,
        href: "/form/1",
        target: "_self",
      },
      {
        title: "File Manager",
        icon: File,
        href: "/file-manager",
      },
    ],
  },
  {
    title: "External",
    icon: Component,
    type: "group",
    items: [
      {
        title: "Sheet",
        icon: Sheet,
        href: "/sheet",
        target: "_self",
      },
      {
        title: "Document",
        icon: DockIcon,
        href: "/document",
        target: "_self"
      },
      {
        title: "Document In Drawer",
        icon: DockIcon,
        href: "/document",
        target: "_sidebar"
      },
      {
        title: "Form in Drawer",
        icon: FormInput,
        href: "/form/1",
        target: "_sidebar",
      },
    ],
  },

  {
    title: "Settings",
    icon: BookOpenCheck,
    href: "/settings",
    isChildren: true,
    actionItemDropdowns: [
      {
        icon: Plus,
        items: [
          {
            title: "Example-01",
            icon: BookOpenCheck,
            href: "#",
          },
          {
            title: "Example-02",
            icon: BookOpenCheck,
            href: "#",
          },
        ],
      },
      {
        icon: MoreVertical,
        items: [
          {
            title: "Example-03",
            icon: BookOpenCheck,
            href: "#",
          },
          {
            title: "Example-04",
            icon: BookOpenCheck,
            href: "#",
          },
        ],
      },
    ],
    children: [
      {
        title: "Example-01",
        icon: BookOpenCheck,
        href: "/settings/check",
      },
    ],
  },
];
