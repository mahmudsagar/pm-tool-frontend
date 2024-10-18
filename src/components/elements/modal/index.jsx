import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Modal = ({ title, onClose, open, children, ...props }) => {
  const onOpenChange = (open) => {
    if (!open && onClose) {
      onClose();
    }
  };
  console.log(title, props)
  return <Dialog onOpenChange={onOpenChange} open={open} {...props}>

    <DialogContent className="w-auto">
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