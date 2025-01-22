import { create } from 'zustand';

const initialState = {
  selected: [],
  changes: { update: {}, delete: {} },
  error: null,
  status: '',
};

export const useInputsStore = create((set) => ({
  ...initialState,

  setSelected: (selected) => set({ selected }),
}));
