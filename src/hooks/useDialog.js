import { useCallback } from 'react';
import useDialogStore from '@/stores/useDialogStore';

/**
 * Hook that returns helpers to open common dialog types.
 *
 * Usage:
 *   const { confirm, openDialog, closeDialog } = useDialog();
 *
 *   // Quick confirmation
 *   confirm({
 *     title: 'Delete item?',
 *     description: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     confirmVariant: 'destructive',
 *     onConfirm: () => deleteItem(id),
 *   });
 *
 *   // General dialog with custom content
 *   openDialog({
 *     type: 'dialog',
 *     title: 'Edit profile',
 *     content: <ProfileForm />,
 *   });
 */
export default function useDialog() {
  const open = useDialogStore((s) => s.openDialog);
  const close = useDialogStore((s) => s.closeDialog);

  const confirm = useCallback(
    (options) =>
      open({
        type: 'alert',
        confirmVariant: 'destructive',
        ...options,
      }),
    [open],
  );

  return { confirm, openDialog: open, closeDialog: close };
}
