import { Dialog, DialogContent } from "@/components/ui/dialog";

const Modal = ({ title, onClose, open, children, ...props }) => {
  const onOpenChange = (open) => {
    if (!open && onClose) {
      onClose();
    }
  };
  return <Dialog onOpenChange={onOpenChange} open={open} modal={true} {...props}>
    {title && <h2 className="text-2xl font-bold">{title}</h2>}
    <DialogContent className="w-auto">
      {children}
    </DialogContent>
  </Dialog>
}

export default Modal;