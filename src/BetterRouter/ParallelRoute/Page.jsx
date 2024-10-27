
import { matchRoutes, useSearchParams } from "react-router-dom";
import React from "react";
import Drawer from "../Drawer";
import { routes } from "../routes";
import Header from "@/layouts/elements/header";
import './style.scss';
import { SheetClose } from "@/components/ui/sheet";
import { X } from "lucide-react";

const ParallelRoutePage = ({ path, target }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = React.useState(true);

  /** will implement modal later, has some issues with the dialog component */
  const Container = target === '_popup' ? Drawer : Drawer;



  const onClose = (state) => {
    if (state) {
      return;
    }
    setOpen(false);

    if (searchParams.has(path)) {
      searchParams.delete(path);
      setSearchParams(searchParams);
    }
  };

  const containerProps = {
    open,
    onOpenChange: onClose,
    contentClassName: 'p-0 parallel-page-sheet-content',
    modal: false,
    closeBtn: false
    // header: <Header showPageTitle={false} />
  };

  /** finding similar routes based on current path */
  const matchedRoutes = matchRoutes(routes, path) || [];
  /** getting the last matched route, as first one can be root route */
  const { route } = matchedRoutes.pop() || {};

  /** if no route element found, then this is not valid for parallel render */
  if (!route?.element) {
    return '';
  }
  return <Container {...containerProps}>
    <Header showPageTitle={false} closeBtn={
      <SheetClose
        className="sheet-close-btn absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
    } />

    {route.element}
  </Container>
}

export default ParallelRoutePage;