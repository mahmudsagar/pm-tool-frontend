import { create } from 'zustand';

interface PaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCommandPalette = create<PaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
