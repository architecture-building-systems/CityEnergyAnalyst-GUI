import { create } from 'zustand';

const useNavigationStore = create((set, get) => ({
  navigate: null,
  location: null,

  // Navigation blocking
  blockers: new Set(),

  // Set navigate and location functions
  setNavigation: (navigateFn, locationObj) => {
    set({ navigate: navigateFn, location: locationObj });
  },

  // Blocking methods
  addBlocker: (blockerId, message) => {
    const { blockers } = get();
    const newBlockers = new Set(blockers);
    newBlockers.add({ id: blockerId, message });
    set({ blockers: newBlockers });
  },

  removeBlocker: (blockerId) => {
    const { blockers } = get();
    const newBlockers = new Set(
      Array.from(blockers).filter((blocker) => blocker.id !== blockerId),
    );
    set({ blockers: newBlockers });
  },

  // Check if navigation should be blocked
  shouldBlock: () => {
    const { blockers } = get();
    return blockers.size > 0;
  },

  // Get confirmation from user
  confirmNavigation: () => {
    const { blockers } = get();
    if (blockers.size === 0) return true;

    // Use the first blocker's message (or combine them if needed)
    const firstBlocker = Array.from(blockers)[0];
    const message =
      firstBlocker?.message ||
      'You have unsaved changes that will be lost if you navigate away. Are you sure you want to continue?';

    return window.confirm(message);
  },

  // Actions (with blocking support)
  push: (path) => {
    const { navigate, shouldBlock, confirmNavigation } = get();
    if (navigate) {
      if (shouldBlock()) {
        if (confirmNavigation()) {
          navigate(path);
        }
      } else {
        navigate(path);
      }
    }
  },

  replace: (path) => {
    const { navigate, shouldBlock, confirmNavigation } = get();
    if (navigate) {
      if (shouldBlock()) {
        if (confirmNavigation()) {
          navigate(path, { replace: true });
        }
      } else {
        navigate(path, { replace: true });
      }
    }
  },

  goBack: () => {
    const { navigate, shouldBlock, confirmNavigation } = get();
    if (navigate) {
      if (shouldBlock()) {
        if (confirmNavigation()) {
          navigate(-1);
        }
      } else {
        navigate(-1);
      }
    }
  },

  goForward: () => {
    const { navigate, shouldBlock, confirmNavigation } = get();
    if (navigate) {
      if (shouldBlock()) {
        if (confirmNavigation()) {
          navigate(1);
        }
      } else {
        navigate(1);
      }
    }
  },

  // Initialize - no longer needed with v7
  init: () => {
    return () => {}; // Return no-op cleanup function
  },

  // Update location from router
  setLocation: (newLocation) => {
    set({ location: newLocation });
  },
}));

export default useNavigationStore;
