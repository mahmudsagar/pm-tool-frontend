import { create } from 'zustand';
import type { ContainerRef, CreatableKind } from './useCreateResource';

interface CreateDialogState {
  open: boolean;
  kind: CreatableKind;
  parent: ContainerRef | null;
  show: (options?: { kind?: CreatableKind; parent?: ContainerRef | null }) => void;
  close: () => void;
}

/** Opens the single app-wide create dialog from anywhere (top bar, hub tiles, sidebar, shortcuts). */
export const useCreateDialog = create<CreateDialogState>((set) => ({
  open: false,
  kind: 'document',
  parent: null,
  show: ({ kind = 'document', parent = null } = {}) => set({ open: true, kind, parent }),
  close: () => set({ open: false }),
}));
