import { useQuery } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useDemoMode } from 'stores/demoStore';
import {
  activeScenarioHeaders,
  childScenarioToken,
} from 'lib/api/scenarioContext';

const EMPTY = {};

/**
 * The construction-type database (`{const_type: {Hs, wwr_*, hvac_type_*, supply_type_*, ...}}`),
 * for the archetype-lock drift check's live lookup: `envelope`/`hvac`/`supply` are a pure lookup
 * on `const_type`, so a building's current value is either equal to
 * `constructionTypes[current const_type][column]` or it has drifted -- see `useArchetypeDrift`.
 *
 * Reuses `GET /inputs/databases` -- the Database Editor's own endpoint (`databaseEditorStore.js`)
 * -- rather than a new route: this is scenario-scoped data (a scenario's own copy of the
 * construction-type CSV, not a global constant), so it is cached per-scenario here the same way
 * `useInputs` is, not fetched once for the whole app. `select` narrows the (much larger) database
 * payload down to just this table before it reaches consumers, so an edit to an unrelated part
 * of the database (use-type schedules, components) does not re-render this hook's callers.
 */
export function useConstructionTypes() {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);
  const childToken = childScenarioToken(childScenario);
  // Not exposed on the demo API, and not wanted there anyway: the drift check this feeds is a
  // no-op in demo mode regardless (see `useArchetypeLock`'s own demo-mode note), so skip the
  // request rather than let it 404.
  const demoMode = useDemoMode();

  return useQuery({
    queryKey: ['inputs-databases', project, scenarioName, childToken],
    queryFn: async () => {
      if (!project || !scenarioName) return EMPTY;
      const { data } = await getScenarioClient().get('/inputs/databases', {
        headers: activeScenarioHeaders(),
      });
      return data;
    },
    select: (data) =>
      data?.archetypes?.construction?.construction_types ?? EMPTY,
    initialData: EMPTY,
    enabled: !demoMode,
    // Deliberately NOT `refetchOnMount: false`: unlike `useInputs`, nothing invalidates
    // `['inputs-databases']` when a scenario is first opened (only `DatabaseEditor`'s own save
    // does, after the fact) -- `initialData` makes `query.state.data` defined from the first
    // render, so with `refetchOnMount: false` this would never actually fetch (see
    // `shouldLoadOnMount`/`shouldFetchOnMount` in `@tanstack/query-core`: the mount-fetch check
    // short-circuits on `data !== undefined` and never reaches `refetchOnMount` at all when it's
    // `false`). Leaving the default (`true`) lets the immediate staleness from `initialData`
    // (no `staleTime` set) trigger the real fetch on mount instead.
    refetchOnWindowFocus: false,
  });
}
