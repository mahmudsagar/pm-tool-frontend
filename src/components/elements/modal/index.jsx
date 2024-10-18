import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Modal = ({ title, onClose, open, children, ...props }) => {
  const onOpenChange = (open) => {
    if (!open && onClose) {
      onClose();
    }
  };
  return <Dialog onOpenChange={onOpenChange} open={open} modal={true} {...props}>
    <DialogHeader>
      <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
      <DialogDescription className="d-none">
        
      </DialogDescription>
    </DialogHeader>
    <DialogContent className="w-auto">
      {children}
    </DialogContent>
  </Dialog>
}

export default Modal;