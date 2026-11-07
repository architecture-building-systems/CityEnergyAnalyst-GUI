import { useQuery } from '@tanstack/react-query';

import { getScenarioClient } from 'lib/api/axios';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';

import { NETWORK_TYPES } from '../utils/networkOverlay';
import { useColumnRequest } from './useScenarioRequestContext';

const LAYER_PATH = '/map_layers/thermal-network/thermal-network';
const NO_NETWORK = 'No network available';

// The `thermal-network` map-layer output for the scenario's most recent network of `type`
// (the layer's own default), or null when it has none.
const fetchNetwork = async (client, headers, type) => {
  const { data: names } = await client.post(
    `${LAYER_PATH}/network-name/choices`,
    { parameters: { 'network-type': type } },
    { headers },
  );
  const name = names?.default;
  if (!name || name === NO_NETWORK) return null;
  const { data } = await client.post(
    `${LAYER_PATH}/generate`,
    {
      parameters: {
        'network-type': type,
        'network-name': name,
        phase: '',
        scale: 1,
      },
    },
    { headers },
  );
  return data;
};

/**
 * A canvas map's thermal networks -- its scenario's, or pathway state's -- as `{ DH, DC }`
 * (null for a type it has none of), for the network overlay (`utils/networkOverlay`). A type
 * that fails to load is left out rather than failing the map. Arguments as `useColumnRequest`.
 */
export const useStateNetworks = (
  columnScenario,
  project,
  childScenario = null,
  { enabled = true } = {},
) => {
  const request = useColumnRequest(columnScenario, project, childScenario);
  return useQuery({
    queryKey: [
      'state-networks',
      request.project,
      request.scenario,
      childScenarioToken(request.childScenario),
    ],
    queryFn: async () => {
      const client = getScenarioClient();
      const headers = scenarioHeaders({
        project: request.project,
        scenarioName: request.scenario,
        childScenario: request.childScenario,
      });
      const results = await Promise.allSettled(
        NETWORK_TYPES.map((type) => fetchNetwork(client, headers, type)),
      );
      return Object.fromEntries(
        NETWORK_TYPES.map((type, i) => [
          type,
          results[i].status === 'fulfilled' ? results[i].value : null,
        ]),
      );
    },
    enabled: enabled && !!request.project && !!request.scenario,
    staleTime: 30_000,
  });
};
