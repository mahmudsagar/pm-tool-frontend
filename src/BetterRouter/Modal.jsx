import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const Modal = ({ children, header = '', contentClassName = '', ...props }) => {
  return (
    <Dialog {...props} defaultOpen={true}>
      <DialogContent className={cn("overflow-y-scroll", contentClassName)}>
        <DialogHeader>
          {header}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;