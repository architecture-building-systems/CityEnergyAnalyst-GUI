import { create } from 'zustand';
import { createBrowserHistory } from 'history';

// Create browser history instance
export const history = createBrowserHistory();

const useNavigationStore = create((set, get) => ({
  location: history.location,

  // Actions
  push: (path) => {
    history.push(path);
    set({ location: history.location });
  },

  replace: (path) => {
    history.replace(path);
    set({ location: history.location });
  },

  goBack: () => {
    history.goBack();
    set({ location: history.location });
  },

  goForward: () => {
    history.goForward();
    set({ location: history.location });
  },

  // Initialize listener
  init: () => {
    const unlisten = history.listen((location) => {
      set({ location });
    });
    return unlisten;
  },
}));

export default useNavigationStore;
