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
})));

export default useStore;
