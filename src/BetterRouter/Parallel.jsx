
import { useSearchParams } from "react-router-dom";
import React from "react";
import ProfileForm from "@/pages/Form";
import Drawer from "./Drawer";


const Parallel = ({ path, target }) => {
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



  if (searchParams.has(path) && !open) {
    return '';
  }
  return <Container open={open} onOpenChange={onClose} className="popup-sidebar-container" rootClassName="popup-sidebar-container">
    <ProfileForm />
  </Container>
}

export default Parallel;