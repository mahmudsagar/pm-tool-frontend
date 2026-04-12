import { matchRoutes, useSearchParams, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import Drawer from "../Drawer";
import { routes } from "../routes";
import Header from "@/layouts/elements/header";
import './style.scss';
import { SheetClose } from "@/components/ui/sheet";
import { X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ParallelRoutePage = ({ path, target }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(true);
  const [pageTopMenu, setPageTopMenu] = useState({ dropdownContent: null, inlineContent: null });
  const navigate = useNavigate();
  /** will implement modal later, has some issues with the dialog component */
  const Container = target === '_popup' ? Drawer : Drawer;

  const handleExpandFullMode = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(path);
    setSearchParams(newParams, { replace: true });
    navigate(path);
  };

  const setTopMenu = (menu) => {
    if (menu && typeof menu === 'object') {
      setPageTopMenu(menu);
    }
  };

  const closeBtn = (
    <div className="flex items-center gap-1">
      <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary flex items-center justify-center w-7 h-7">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetClose>
    </div>
  );

  const topMenu = {
    ...pageTopMenu,
    inlineContent: (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-sm opacity-70 hover:opacity-100 w-7 h-7"
          onClick={handleExpandFullMode}
          title="Open in full mode"
          >
          <Maximize2 className="h-4 w-4" />
          <span className="sr-only">Open in full mode</span>
        </Button>
        {pageTopMenu?.inlineContent}
      </>
    ),
  };



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
  const { route, params } = matchedRoutes.pop() || {};

  /** if no route element found, then this is not valid for parallel render */
  if (!route?.element) {
    return '';
  }
  return <Container {...containerProps}>
    <Header topMenu={topMenu} showPageTitle={false} closeBtn={closeBtn} />

    {React.cloneElement(route.element, { ...params, setTopMenu })}
  </Container>
}

export default ParallelRoutePage;