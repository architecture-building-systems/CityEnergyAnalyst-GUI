import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { getScenarioClient } from 'lib/api/axios';
import {
  CHILD_SCENARIO_HEADER,
  SCENARIO_NAME_HEADER,
} from 'lib/api/scenarioContextHeaders';

import { childStateScenarioPath, useCanvasStore } from '../stores/canvasStore';
import { useColumnInputs } from './useColumnInputs';

vi.mock('lib/api/axios', () => ({ getScenarioClient: vi.fn() }));

const client = { get: vi.fn() };

// Headers of the request the hook sends. It does not fetch on mount (`initialData`,
// `refetchOnMount: false`); `CanvasMap` calls `refetch`, so do the same.
const requestHeaders = async (...args) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { result } = renderHook(() => useColumnInputs(...args), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  result.current.refetch();
  await waitFor(() => expect(client.get).toHaveBeenCalled());
  return client.get.mock.calls[0][1].headers;
};

beforeEach(() => {
  vi.clearAllMocks();
  getScenarioClient.mockReturnValue(client);
  client.get.mockResolvedValue({ data: { geojsons: {} } });
  useCanvasStore.setState({ columns: [], parentScenario: null });
});

describe('useColumnInputs', () => {
  it('targets an explicit state as parent name plus child header', async () => {
    // A pathway-multi row's map: not a canvas column, so it names its state.
    const headers = await requestHeaders('baseline', '/p', {
      pathway_name: 'S1',
      year: 2050,
    });
    expect(headers[SCENARIO_NAME_HEADER]).toBe('baseline');
    expect(headers[CHILD_SCENARIO_HEADER]).toBe('S1/2050');
  });

  it('resolves a pathway-state column from the canvas columns', async () => {
    const statePath = childStateScenarioPath('baseline', 'S1', 2040);
    useCanvasStore.setState({
      parentScenario: 'baseline',
      columns: [
        {
          type: 'pathway-state',
          pathwayName: 'S1',
          year: 2040,
          scenario: statePath,
        },
      ],
    });
    const headers = await requestHeaders(statePath, '/p');
    expect(headers[SCENARIO_NAME_HEADER]).toBe('baseline');
    expect(headers[CHILD_SCENARIO_HEADER]).toBe('S1/2040');
  });

  it('sends a plain scenario without a child header', async () => {
    const headers = await requestHeaders('baseline', '/p');
    expect(headers[SCENARIO_NAME_HEADER]).toBe('baseline');
    expect(headers).not.toHaveProperty(CHILD_SCENARIO_HEADER);
  });
});
