import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create(subscribeWithSelector((set) => ({
  count: JSON.parse(localStorage.getItem('BetterNotionStorage'))?.state?.count | 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  /** later organize with slices */

  currentRoute: {},
  setCurrentRoute: (pageDetail) => set({ currentRoute: pageDetail }),
})));

export const useSidebar = create((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export default useStore;
