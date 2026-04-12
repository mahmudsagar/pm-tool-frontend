import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const Drawer = ({ children, header = '', contentClassName = '', ...props }) => {


  return <Sheet {...props}>
    <SheetContent  closeBtn={false} className={cn("w-full md:w-[70vw] md:max-w-[60vw] overflow-y-scroll max-h-screen", contentClassName)} onInteractOutside={(e) => {
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