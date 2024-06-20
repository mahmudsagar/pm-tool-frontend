import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const Drawer = ({ children, ...props }) => {


  return <Sheet {...props}>
    <SheetContent className="w-[400px] sm:w-[540px] lg:max-w-screen-lg overflow-y-scroll max-h-screen">
      <SheetHeader>
        {/* <SheetTitle>A parallel route page</SheetTitle> */}
        {/* <SheetDescription>
          This action cannot be undone. This will permanently delete your account
          and remove your data from our servers.
          
        </SheetDescription> */}
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
}

export default Drawer;