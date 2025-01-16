import { create } from 'zustand';

export const useTableStore = create((set) => ({
  selected: [],
  changes: { update: {}, delete: {} },

  setSelected: (selected) => set({ selected }),
  updateChanges: (changes) => set({ changes }),
}));

export const useSelected = () => useTableStore((state) => state.selected);
export const useChanges = () => useTableStore((state) => state.changes);

export const useSetSelected = () => useTableStore((state) => state.setSelected);
export const useUpdateChanges = () =>
  useTableStore((state) => state.updateChanges);
