import { create } from 'zustand';

// Read-only demo mode state for anonymous visitors (no valid session).
// Kept dependency-free (no axios import) since `lib/api/axios.js` reads
// from this store inside its request interceptor - importing axios here
// would create a circular import.
const useDemoStore = create((set) => ({
  demoMode: false,
  demoId: null,
  demoScenarios: [], // [{ id, name }, ...]
  // Domains the demo sub-app serves (e.g. '/inputs/', '/canvas/'), returned
  // by the backend alongside the scenario list. Read by lib/api/axios.js's
  // demoClient interceptor to decide which requests are demo-eligible -
  // backend-derived so it can't drift from the actual demo route table.
  routePrefixes: [],

  // Enter demo mode with the fetched scenario list, defaulting to the
  // first scenario (if any) as the active one.
  enterDemo: (scenarios, routePrefixes = []) =>
    set({
      demoMode: true,
      demoScenarios: scenarios,
      demoId: scenarios?.[0]?.id ?? null,
      routePrefixes,
    }),

  setDemoId: (demoId) => set({ demoId }),

  exitDemo: () =>
    set({ demoMode: false, demoId: null, demoScenarios: [], routePrefixes: [] }),
}));

export const useDemoMode = () => useDemoStore((state) => state.demoMode);

export default useDemoStore;
