import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create(subscribeWithSelector((set) => ({
  viewData: JSON.parse(localStorage.getItem('BetterNotionStorage'))?.state?.viewData || {},
  setViewData: (viewId, newData) => {
    return set(({ viewData }) => ({
      viewData: {
        ...viewData,
        [viewId]: newData
      }
    }))
  },

  count: JSON.parse(localStorage.getItem('BetterNotionStorage'))?.state?.count || 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),

  user: {
    name: 'John Doe',
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
  },
  setUser: (newUser) => set({ user: newUser }),

  /** later organize with slices */

  currentRoute: {},
  setCurrentRoute: (pageDetail) => set({ currentRoute: pageDetail }),
})));

export const useSidebar = create((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export default useStore;
