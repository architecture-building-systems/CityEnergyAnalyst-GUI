import { create } from 'zustand';

export const useMapStore = create((set) => ({
  visibility: {},
  setVisibility: (layer, value) =>
    set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
}));
