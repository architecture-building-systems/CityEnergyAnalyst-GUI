import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useDemoMode } from 'stores/demoStore';
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
  mapped_use_types: null,
  mapped_computed_values: null,
};

/**
 * Archetype Lock state for the active scenario.
 *
 * `derived_tabs` and `archetype_key_columns` come from the server rather than being duplicated
 * here: they are defined by what `archetypes_mapper` writes, and a second copy in the frontend
 * would drift the moment the mapper gains an output.
 *
 * `mapped_use_types` and `mapped_computed_values` are the baselines the real, per-building,
 * per-tab drift check compares against -- see `useArchetypeDrift`, which does that comparison
 * client-side (a plain value-equality check, no hashing) against the tables this hook's caller
 * already has loaded. `drifted` here is only the coarse, `use_type`-only server-side fallback
 * (see `archetype_lock.is_drifted`'s docstring).
 */
export function useArchetypeLock() {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);
  const childToken = childScenarioToken(childScenario);
  // Not exposed on the demo API (archetype-lock is editor state for a control demo
  // visitors can't operate) - skip the request rather than let it 404, and stay on
  // the EMPTY default.
  const demoMode = useDemoMode();

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
    enabled: !demoMode,
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
    // Awaited, not fire-and-forget: `mutateAsync` resolving (and `isPending` going false) is
    // what re-enables the input editor (see `InputTable.jsx`'s `readOnly`/toggle gating) -- if
    // it resolved before these landed, an edit made in that gap could get silently overwritten
    // once the refetch actually completes.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['archetype-lock'] }),
        // Re-locking rewrites every derived table, so the loaded tables are stale.
        queryClient.invalidateQueries({ queryKey: ['inputs'] }),
      ]);
    },
  });
}
