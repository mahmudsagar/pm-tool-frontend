import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModal } from "./useModal";


const Modal = ({ ...props }) => {
  const { isOpen, content, closeModal } = useModal();
  return <Dialog onOpenChange={closeModal} open={isOpen} modal={true} defaultOpen={isOpen} {...props}>
    <DialogContent className="w-auto">
      {content}
    </DialogContent>
  </Dialog>
}

export default Modal;