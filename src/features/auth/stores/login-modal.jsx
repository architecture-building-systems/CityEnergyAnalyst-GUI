import { create } from 'zustand';

const useLoginModalStore = create((set) => ({
  showLoginModal: false,
  setShowLoginModal: (showLoginModal) => set({ showLoginModal }),
}));

export const useShowLoginModal = () =>
  useLoginModalStore((state) => state.showLoginModal);

export const useSetShowLoginModal = () =>
  useLoginModalStore((state) => state.setShowLoginModal);
