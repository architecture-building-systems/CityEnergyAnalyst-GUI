import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { getScenarioClient } from 'lib/api/axios';
import { CHILD_SCENARIO_HEADER } from 'lib/api/scenarioContextHeaders';

import { useStateNetworks } from './useStateNetworks';

vi.mock('lib/api/axios', () => ({ getScenarioClient: vi.fn() }));

const client = { post: vi.fn() };

// The state has a DH network only; `failDc` makes the DC lookup fail instead.
const respond = ({ failDc = false } = {}) =>
  client.post.mockImplementation(async (url, body) => {
    const type = body.parameters['network-type'];
    if (url.endsWith('/network-name/choices')) {
      if (type === 'DC' && failDc) throw new Error('boom');
      return {
        data: {
          default:
            type === 'DH' ? 'thermal_network_2050' : 'No network available',
        },
      };
    }
    return {
      data: { edges: {}, nodes: {}, name: body.parameters['network-name'] },
    };
  });

const render = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(
    () =>
      useStateNetworks('baseline', '/p', { pathway_name: 'S1', year: 2050 }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    },
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  getScenarioClient.mockReturnValue(client);
});

describe('useStateNetworks', () => {
  it("loads each type's most recent network of the state, null when it has none", async () => {
    respond();
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.DH.name).toBe('thermal_network_2050');
    expect(result.current.data.DC).toBeNull();
    const generate = client.post.mock.calls.find(([url]) =>
      url.endsWith('/generate'),
    );
    expect(generate[2].headers[CHILD_SCENARIO_HEADER]).toBe('S1/2050');
  });

  it('leaves out a type that fails to load, keeping the other', async () => {
    respond({ failDc: true });
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data.DH).not.toBeNull();
    expect(result.current.data.DC).toBeNull();
  });
});
