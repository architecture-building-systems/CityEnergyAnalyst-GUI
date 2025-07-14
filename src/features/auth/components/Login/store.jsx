import { create } from 'zustand';

export const useLoginStore = create((set) => ({
  showLoginModal: false,
  setShowLoginModal: (showLoginModal) => set({ showLoginModal }),
}));

export const useShowLoginModal = () =>
  useLoginStore((state) => state.showLoginModal);

export const useSetShowLoginModal = () =>
  useLoginStore((state) => state.setShowLoginModal);
