import { create } from 'zustand';

/** UI routing state for the parallel-route drawer (see BetterRouter). */
const useStore = create((set) => ({
  currentRoute: {},
  setCurrentRoute: (pageDetail) => set({ currentRoute: pageDetail }),

  reset: () => {
    localStorage.removeItem('BetterNotionStorage');
    set({ currentRoute: {} });
  },
}));

export const useSidebar = create((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export default useStore;
