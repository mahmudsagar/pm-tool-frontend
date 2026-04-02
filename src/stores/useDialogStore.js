import { create } from 'zustand';

const useDialogStore = create((set) => ({
  dialogs: [],

  /**
   * Open a dialog. Returns a unique id that can be used to close it.
   *
   * @param {object} options
   * @param {'alert' | 'dialog'} options.type - 'alert' for confirmation dialogs, 'dialog' for general content
   * @param {string} options.title
   * @param {string} [options.description]
   * @param {import('react').ReactNode} [options.content] - Custom body content (rendered below description)
   * @param {string} [options.confirmLabel='Confirm']
   * @param {string} [options.cancelLabel='Cancel']
   * @param {'default' | 'destructive'} [options.confirmVariant='default']
   * @param {() => void | Promise<void>} [options.onConfirm]
   * @param {() => void} [options.onCancel]
   * @param {boolean} [options.closeOnClickOutside=true]
   */
  openDialog: (options) => {
    const id = `dialog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const dialog = {
      id,
      type: 'alert',
      title: '',
      description: '',
      content: null,
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      confirmVariant: 'default',
      onConfirm: null,
      onCancel: null,
      closeOnClickOutside: true,
      ...options,
    };
    set((state) => ({ dialogs: [...state.dialogs, dialog] }));
    return id;
  },

  closeDialog: (id) => {
    set((state) => ({ dialogs: state.dialogs.filter((d) => d.id !== id) }));
  },

  closeAll: () => set({ dialogs: [] }),
}));

export default useDialogStore;
