import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useDialogStore from '@/stores/useDialogStore';

/**
 * Single alert-style dialog (confirmation with title, description, confirm/cancel).
 */
function AlertDialogInstance({ dialog }) {
  const closeDialog = useDialogStore((s) => s.closeDialog);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const close = useCallback(() => {
    setIsOpen(false);
    // Wait for Radix exit animation to finish before unmounting,
    // otherwise the overlay/aria-hidden is never cleaned up.
    setTimeout(() => closeDialog(dialog.id), 200);
  }, [dialog.id, closeDialog]);

  const handleCancel = useCallback(() => {
    if (typeof dialog.onCancel === 'function') {
      dialog.onCancel();
    }
    close();
  }, [dialog, close]);

  const handleConfirm = useCallback(async () => {
    if (typeof dialog.onConfirm === 'function') {
      const result = dialog.onConfirm();
      if (result && typeof result.then === 'function') {
        setLoading(true);
        try {
          await result;
        } finally {
          setLoading(false);
        }
      }
    }
    close();
  }, [dialog, close]);

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          {dialog.description && (
            <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {dialog.content}
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {dialog.cancelLabel}
          </Button>
          <Button
            variant={dialog.confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Loading…' : dialog.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * General dialog (custom content, no built-in confirm/cancel unless provided).
 */
function DialogInstance({ dialog }) {
  const closeDialog = useDialogStore((s) => s.closeDialog);
  const [isOpen, setIsOpen] = useState(true);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => closeDialog(dialog.id), 200);
  }, [dialog.id, closeDialog]);

  const handleClose = useCallback(() => {
    if (typeof dialog.onCancel === 'function') {
      dialog.onCancel();
    }
    close();
  }, [dialog, close]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        aria-describedby={dialog.description ? undefined : undefined}
        onInteractOutside={(e) => {
          if (!dialog.closeOnClickOutside) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          {dialog.description ? (
            <DialogDescription>{dialog.description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only" />
          )}
        </DialogHeader>
        {dialog.content}
        {dialog.onConfirm && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {dialog.cancelLabel}
            </Button>
            <Button variant={dialog.confirmVariant} onClick={() => { dialog.onConfirm(); close(); }}>
              {dialog.confirmLabel}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Render this once at the app root. It renders all active dialogs from the store.
 */
export default function GlobalDialogProvider() {
  const dialogs = useDialogStore((s) => s.dialogs);

  return dialogs.map((dialog) =>
    dialog.type === 'alert' ? (
      <AlertDialogInstance key={dialog.id} dialog={dialog} />
    ) : (
      <DialogInstance key={dialog.id} dialog={dialog} />
    )
  );
}
