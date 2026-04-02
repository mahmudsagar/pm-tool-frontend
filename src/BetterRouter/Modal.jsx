import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const Modal = ({ children, header = '', contentClassName = '', ...props }) => {
  return (
    <Dialog {...props} defaultOpen={true}>
      <DialogContent className={cn("overflow-y-scroll", contentClassName)}>
        <DialogHeader>
          <DialogTitle>{header}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;