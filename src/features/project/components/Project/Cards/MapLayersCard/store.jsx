import { create } from 'zustand';

export const useActiveMapLayersStore = create((set) => ({
  active: null,
  setActive: (active) => set({ active }),
}));

export const useActiveMapLayer = () =>
  useActiveMapLayersStore((state) => state.active);

export const useSetActiveMapLayer = () =>
  useActiveMapLayersStore((state) => state.setActive);
