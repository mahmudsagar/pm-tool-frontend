import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarMenu } from "./SidebarMenu";

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="flex items-center justify-center gap-2" aria-label="Open navigation">
          <MenuIcon />
          <span className="text-lg font-semibold">Better Notion</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <div className="px-1 py-6 pt-16">
          <SidebarMenu setOpen={setOpen} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
