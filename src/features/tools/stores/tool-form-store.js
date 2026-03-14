import { create } from 'zustand';

export const useToolFormStore = create((set) => ({
  activeKey: [],
  expandCategories: (categories) => {
    if (!categories || categories.length === 0) return;
    set((state) => ({
      activeKey: [...new Set([...state.activeKey, ...categories])],
    }));
  },
  setActiveKey: (keys) => set({ activeKey: keys }),
  reset: () => set({ activeKey: [] }),
}));
