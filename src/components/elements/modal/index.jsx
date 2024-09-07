import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useModal } from "./useModal";


const Modal = () => {
  const { isOpen, content, closeModal } = useModal();
  console.log('isOpen', isOpen);

  return <Dialog onOpenChange={closeModal} open={isOpen} modal={true} defaultOpen={isOpen}>
    <DialogContent className="w-auto">
      {content}
    </DialogContent>
  </Dialog>
}

export default Modal;