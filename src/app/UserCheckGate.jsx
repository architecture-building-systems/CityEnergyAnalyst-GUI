import { useEffect } from 'react';

import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';
import Loading from 'components/Loading';
import { useIsValidUser, useUserQuery } from 'stores/useUserQuery';
import { useFetchServerLimits } from 'stores/serverStore';
import { isElectron } from 'utils/electron';
import { publicClient } from 'lib/api/axios';
import useDemoStore from 'stores/demoStore';
import { useProjectStore } from 'features/project/stores/projectStore';

// Fetches the public demo scenario allowlist and seeds both the demo store
// and the project store, so anonymous visitors (no valid session) see the
// project page rendered against a read-only demo scenario instead of an
// empty state. See stores/demoStore.js and lib/api/axios.js's demoClient
// for how requests get transparently routed to `/api/demo/...` from there.
//
// `userInfo` drives the transition both ways: `null` means "confirmed no
// session" (enter demo mode); a real user object means a session appeared
// (e.g. the visitor just logged in) - leave demo mode and let
// useInitProjectStore's normal localStorage-driven flow take back over.
const useInitDemoStore = (userInfo) => {
  useEffect(() => {
    // Read the demo/project store actions imperatively (rather than
    // subscribing via selectors) so this effect only depends on `userInfo` -
    // it should run exactly once per session transition, not every time
    // `enterDemo`/`exitDemo` themselves flip `demoMode` (that would re-fire
    // this same effect and re-fetch the scenario list forever).
    const { demoMode, enterDemo, exitDemo } = useDemoStore.getState();
    const { seedDemoProject, clearDemoProject } = useProjectStore.getState();

    // Electron always manages its own local project storage and never
    // needs anonymous demo browsing - never enter demo mode there.
    if (isElectron() || userInfo !== null) {
      // A real session appeared - leave demo mode if we were in it.
      if (demoMode) {
        exitDemo();
        clearDemoProject();
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicClient.get('/api/demo/scenarios');
        const scenarios = data?.scenarios ?? [];
        if (cancelled) return;

        enterDemo(scenarios);
        if (scenarios.length) {
          seedDemoProject({
            scenario: scenarios[0].id,
            scenariosList: scenarios.map((s) => s.id),
          });
        }
      } catch (error) {
        // No public_demo_scenarios configured on this backend (404), or a
        // genuine network failure - either way, fall back to an empty demo
        // scenario list rather than leaving the project page stuck loading.
        console.error('Failed to load demo scenarios:', error);
        if (!cancelled) enterDemo([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userInfo]);
};

const UserCheckGate = ({ children }) => {
  const { data: userInfo, isLoading, isError } = useUserQuery();
  const isValidUser = useIsValidUser();
  const fetchServerLimits = useFetchServerLimits();

  const { push } = useNavigationStore();

  useInitDemoStore(userInfo);

  useEffect(() => {
    // Fall back to the project page if no active session or network error
    if (userInfo === null || isError) {
      push(routes.PROJECT);
      return;
    }

    // Wait for userInfo to be loaded
    // Also not fetch server limits if Electron or localuser
    if (isElectron() || !isValidUser) return;

    if (!userInfo?.onboarded) {
      // Redirect to onboarding page
      push(routes.ONBOARDING);
    } else if (window.location.pathname === routes.ONBOARDING) {
      // Redirect to project page
      push(routes.PROJECT);
    }
    fetchServerLimits();
  }, [userInfo, isError, isValidUser, fetchServerLimits, push]);

  if (isLoading) return <Loading />;

  if (isError) return <div>Error loading user info. Redirecting...</div>;

  return children;
};

export default UserCheckGate;
