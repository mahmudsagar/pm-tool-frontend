import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const Drawer = ({ children, header = '', contentClassName = '', ...props }) => {


  return <Sheet {...props}>
    <SheetContent  closeBtn={false} className={cn("w-[600px] sm:w-[740px] lg:max-w-screen-lg overflow-y-scroll max-h-screen", contentClassName)} onInteractOutside={(e) => {
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