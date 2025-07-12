import { create } from 'zustand';

const useNavigationStore = create((set, get) => ({
  navigate: null,
  location: null,

  // Set navigate and location functions
  setNavigation: (navigateFn, locationObj) => {
    set({ navigate: navigateFn, location: locationObj });
  },

  // Actions
  push: (path) => {
    const { navigate } = get();
    if (navigate) {
      navigate(path);
    }
  },

  replace: (path) => {
    const { navigate } = get();
    if (navigate) {
      navigate(path, { replace: true });
    }
  },

  goBack: () => {
    const { navigate } = get();
    if (navigate) {
      navigate(-1);
    }
  },

  goForward: () => {
    const { navigate } = get();
    if (navigate) {
      navigate(1);
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
