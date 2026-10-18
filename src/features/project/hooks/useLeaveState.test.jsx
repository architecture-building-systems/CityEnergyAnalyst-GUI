import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';

import { useMapStore } from 'features/map/stores/mapStore';
import { useProjectStore } from 'features/project/stores/projectStore';

import { useLeaveState } from './useLeaveState';

it('leaves the state: scenario data and map geometry, refetched', () => {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  useProjectStore.setState({
    childScenario: { pathway_name: 'S1', year: 2040 },
  });
  useMapStore.setState({ stateZoneOverride: { features: [] } });

  const { result } = renderHook(() => useLeaveState(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  act(() => result.current());

  expect(useProjectStore.getState().childScenario).toBeNull();
  expect(useMapStore.getState().stateZoneOverride).toBeNull();
  expect(invalidate).toHaveBeenCalledWith();
});
