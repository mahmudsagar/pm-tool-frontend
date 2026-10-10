import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const Drawer = ({ children, header = '', contentClassName = '', ...props }) => {


  return <Sheet {...props}>
    <SheetContent  closeBtn={false} className={cn("w-full gap-0 overflow-y-auto sm:max-w-none md:w-[min(720px,70vw)]", contentClassName)} onInteractOutside={(e) => {
      e.preventDefault();
    }}>
      <SheetHeader>
        {header}
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
}

export default Drawer;