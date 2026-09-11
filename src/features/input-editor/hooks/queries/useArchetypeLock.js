import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  activeScenarioHeaders,
  childScenarioToken,
} from 'lib/api/scenarioContext';

const ENDPOINT = `${API_ENDPOINTS.INPUTS}/archetype-lock`;

const EMPTY = {
  locked: false,
  drifted: false,
  derived_tabs: [],
  archetype_key_columns: [],
};

/**
 * Archetype-Lock state for the active scenario.
 *
 * `derived_tabs` and `archetype_key_columns` come from the server rather than being duplicated
 * here: they are defined by what `archetypes_mapper` writes, and a second copy in the frontend
 * would drift the moment the mapper gains an output.
 */
export function useArchetypeLock() {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);
  const childToken = childScenarioToken(childScenario);

  return useQuery({
    queryKey: ['archetype-lock', project, scenarioName, childToken],
    queryFn: async () => {
      if (!project || !scenarioName) return EMPTY;
      const { data } = await getScenarioClient().get(ENDPOINT, {
        headers: activeScenarioHeaders(),
      });
      return data;
    },
    initialData: EMPTY,
    refetchOnWindowFocus: false,
  });
}

export function useSetArchetypeLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locked) => {
      const { data } = await getScenarioClient().put(
        ENDPOINT,
        { locked },
        { headers: activeScenarioHeaders() },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archetype-lock'] });
      // Re-locking rewrites every derived table, so the loaded tables are stale.
      queryClient.invalidateQueries({ queryKey: ['inputs'] });
    },
  });
}
