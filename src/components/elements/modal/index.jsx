import { Dialog } from "@/components/ui/dialog";
import { useModal } from "./useModal";


const Modal = () => {
  const { isOpen, content, closeModal } = useModal();

  return <Dialog onOpenChange={closeModal} open={isOpen} modal defaultOpen={isOpen}>{content}</Dialog>;
}

export default Modal;