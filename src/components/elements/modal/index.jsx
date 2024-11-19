import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Modal = ({ title, onClose, open, children, closeOnClickOutside, ...props }) => {
  const onOpenChange = (open) => {
    if (!open && onClose) {
      onClose();
    }
  };

  return <Dialog onOpenChange={onOpenChange} className="z-9999" open={open} {...props}>
    <DialogContent className="w-auto" onInteractOutside={(e) => {
      if (!closeOnClickOutside) {
        e.preventDefault();
      }
    }}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="d-none">

        </DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
}

export default Modal;