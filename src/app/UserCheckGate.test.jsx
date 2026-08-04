import { render, waitFor } from '@testing-library/react';

import useDemoStore from 'stores/demoStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useUserQuery } from 'stores/useUserQuery';
import { isElectron } from 'utils/electron';
import { publicClient } from 'lib/api/axios';

import UserCheckGate from './UserCheckGate';

// vi.mock calls are hoisted above these imports by Vitest, so the bindings
// above already resolve to the mocked implementations.
vi.mock('stores/useUserQuery', () => ({
  useUserQuery: vi.fn(),
  useIsValidUser: vi.fn(() => true),
}));

vi.mock('stores/serverStore', () => ({
  useFetchServerLimits: vi.fn(() => vi.fn()),
}));

vi.mock('utils/electron', () => ({
  isElectron: vi.fn(() => false),
}));

vi.mock('lib/api/axios', async () => {
  const actual = await vi.importActual('lib/api/axios');
  return {
    ...actual,
    publicClient: { get: vi.fn() },
  };
});

const mockUserQuery = (userInfo, extra = {}) => {
  useUserQuery.mockReturnValue({
    data: userInfo,
    isLoading: false,
    isError: false,
    ...extra,
  });
};

const initialDemoState = useDemoStore.getInitialState();
const initialProjectState = useProjectStore.getInitialState();

beforeEach(() => {
  useDemoStore.setState(initialDemoState, true);
  useProjectStore.setState(initialProjectState, true);
  isElectron.mockReturnValue(false);
  publicClient.get.mockReset();
});

describe('anonymous visitor (userInfo === null)', () => {
  it('fetches /demo/scenarios and enters demo mode with both the scenario list and route_prefixes', async () => {
    const scenarios = [{ id: 'baseline', name: 'baseline' }];
    const routePrefixes = ['/inputs/', '/canvas/'];
    publicClient.get.mockResolvedValue({
      data: { scenarios, route_prefixes: routePrefixes },
    });
    mockUserQuery(null);

    render(<UserCheckGate>content</UserCheckGate>);

    await waitFor(() => {
      expect(publicClient.get).toHaveBeenCalledWith('/demo/scenarios');
    });
    await waitFor(() => {
      expect(useDemoStore.getState().demoMode).toBe(true);
    });
    expect(useDemoStore.getState().demoId).toBe('baseline');
    expect(useDemoStore.getState().routePrefixes).toEqual(routePrefixes);
    expect(useProjectStore.getState().scenario).toBe('baseline');
  });

  it('falls back to an empty demo scenario list on a failed fetch, instead of a stuck or thrown state', async () => {
    publicClient.get.mockRejectedValue(new Error('network error'));
    mockUserQuery(null);

    render(<UserCheckGate>content</UserCheckGate>);

    await waitFor(() => {
      expect(useDemoStore.getState().demoMode).toBe(true);
    });
    expect(useDemoStore.getState().demoId).toBeNull();
    expect(useDemoStore.getState().demoScenarios).toEqual([]);
  });
});

describe('Electron', () => {
  it('never fetches the demo scenario list', async () => {
    isElectron.mockReturnValue(true);
    mockUserQuery(null);

    render(<UserCheckGate>content</UserCheckGate>);

    // Nothing to await on directly - give any stray effect a tick, then
    // assert the fetch never happened.
    await Promise.resolve();
    expect(publicClient.get).not.toHaveBeenCalled();
    expect(useDemoStore.getState().demoMode).toBe(false);
  });
});

describe('a session appears while in demo mode', () => {
  it('exits demo mode and clears the seeded demo project', async () => {
    useDemoStore.setState({
      demoMode: true,
      demoId: 'baseline',
      demoScenarios: [{ id: 'baseline' }],
      routePrefixes: ['/inputs/'],
    });
    useProjectStore.setState({
      name: 'Demo',
      project: '__demo__',
      scenario: 'baseline',
      scenariosList: ['baseline'],
    });
    mockUserQuery({ id: 'user-1', onboarded: true });

    render(<UserCheckGate>content</UserCheckGate>);

    await waitFor(() => {
      expect(useDemoStore.getState().demoMode).toBe(false);
    });
    expect(useDemoStore.getState().routePrefixes).toEqual([]);
    expect(useProjectStore.getState().project).toBeNull();
    expect(publicClient.get).not.toHaveBeenCalled();
  });
});
