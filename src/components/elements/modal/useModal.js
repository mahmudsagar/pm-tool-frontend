import { create } from "zustand";

export const useModal = create((set) => ({
  isOpen: false,
  openModal: ({ title = '', content = null }) => set({ isOpen: true, title, content }),
  closeModal: () => set({ isOpen: false }),
  content: null,
  setContent: (content) => set({ content }),
}));