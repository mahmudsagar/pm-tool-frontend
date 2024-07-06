
import { matchRoutes, useSearchParams } from "react-router-dom";
import React from "react";
import Drawer from "./Drawer";
import { routes } from "./config";


const ParallelRoutePage = ({ path, target }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = React.useState(true);

  /** will implement modal later */
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

  /** finding similar routes based on current path */
  const matchedRoutes = matchRoutes(routes, path) || [];
  /** getting the last matched route, as first one can be root route */
  const { route } = matchedRoutes.pop() || {};

  /** if no route element found, then this is not valid for parallel render */
  if (!route?.element) {
    return '';
  }
  return <Container open={open} onOpenChange={onClose}>
    {route.element}
  </Container>
}

export default ParallelRoutePage;