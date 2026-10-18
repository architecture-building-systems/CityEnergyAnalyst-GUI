import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { getScenarioClient } from 'lib/api/axios';
import {
  CHILD_SCENARIO_HEADER,
  SCENARIO_NAME_HEADER,
} from 'lib/api/scenarioContextHeaders';

import { useFetchKpiValue } from './useFetchKpis';

vi.mock('lib/api/axios', () => ({ getScenarioClient: vi.fn() }));
vi.mock('lib/socket', () => ({
  getSocket: vi.fn(),
  waitForConnection: vi.fn(),
}));

const client = { get: vi.fn() };

const render = (props) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useFetchKpiValue(props), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  getScenarioClient.mockReturnValue(client);
  client.get.mockResolvedValue({ data: { value: 1 } });
});

describe('useFetchKpiValue', () => {
  it('addresses a pathway state by parent name plus child header', async () => {
    const { result } = render({
      project: '/p',
      scenario: 'baseline',
      childScenario: { pathway_name: 'S1', year: 2040 },
      kpiId: 'architecture.total_gfa_m2',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const { headers } = client.get.mock.calls[0][1];
    expect(headers[SCENARIO_NAME_HEADER]).toBe('baseline');
    expect(headers[CHILD_SCENARIO_HEADER]).toBe('S1/2040');
  });

  it('sends no child header for the scenario itself', async () => {
    const { result } = render({
      project: '/p',
      scenario: 'baseline',
      kpiId: 'architecture.total_gfa_m2',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.get.mock.calls[0][1].headers).not.toHaveProperty(
      CHILD_SCENARIO_HEADER,
    );
  });
});
