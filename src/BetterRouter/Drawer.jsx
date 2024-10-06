import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const Drawer = ({ children, header = '', contentClassName = '', ...props }) => {


  return <Sheet {...props}>
    <SheetContent className={cn("w-[500px] sm:w-[640px] lg:max-w-screen-lg overflow-y-scroll max-h-screen", contentClassName)}>
      <SheetHeader>
        {header}
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
}

export default Drawer;