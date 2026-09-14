// Deliberately stays on `apiClient`, not `getScenarioClient()` - unlike the
// GET side of Input Editor, saves are never routed to the demo sub-app (no
// PUT route exists there). A save attempted in demo mode fails against the
// real backend with a synthetic project header; the existing onError toast
// surfaces it rather than saving silently or crashing.
import { apiClient } from 'lib/api/axios';
import {
  activeScenarioHeaders,
  childScenarioToken,
} from 'lib/api/scenarioContext';
import { API_ENDPOINTS } from 'lib/api/endpoints';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  useChanges,
  useResetStore,
} from 'features/input-editor/stores/inputEditorStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pathwayOverviewQueryKey } from 'features/pathway/hooks/usePathwayOverview';

export function useSaveInputs() {
  const queryClient = useQueryClient();

  const changes = useChanges();
  const resetStore = useResetStore();

  return useMutation({
    mutationFn: async () => {
      const {
        project,
        name: projectName,
        scenario: scenarioName,
        childScenario,
      } = useProjectStore.getState();
      const childToken = childScenarioToken(childScenario);
      const inputsQueryKey = ['inputs', project, scenarioName, childToken];

      const { tables, geojsons, crs } =
        queryClient.getQueryData(inputsQueryKey) ?? {};

      const schedules = Object.keys(changes.update?.schedules ?? {}).reduce(
        (obj, key) => {
          obj[key] = queryClient.getQueryData([
            'inputs',
            'building-schedule',
            key,
            projectName,
            scenarioName,
            childToken,
          ]);
          return obj;
        },
        {},
      );

      const { data } = await apiClient.put(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        { tables, geojsons, crs, schedules },
        { headers: activeScenarioHeaders() },
      );
      // Carry the scenario (and its query key) this request was actually
      // made for through to onSuccess -- the project store may have moved
      // on to a different scenario by the time the PUT resolves, and
      // re-reading it there would merge the response into the wrong (or no)
      // cache entry, or invalidate the wrong (or no) pathway overview query.
      return { data, inputsQueryKey, scenario: scenarioName, childScenario };
    },
    onSuccess: async ({ data, inputsQueryKey, scenario, childScenario }) => {
      resetStore();
      // Merge the save's own response into the cache instead of refetching
      // it: `save_all_inputs` already re-reads whatever it wrote (including
      // any archetype re-map) specifically so the client does not have to
      // ask again (see `inputs.py`'s "Hand back what the mapper wrote"
      // comment). `crs`/`columns`/`colors`/`connected_buildings` are left as
      // they were -- a save cannot change any of those.
      queryClient.setQueryData(inputsQueryKey, (old) => ({
        ...old,
        tables: { ...old?.tables, ...data.tables },
        geojsons: { ...old?.geojsons, ...data.geojsons },
      }));
      // A save while a pathway state is the active scenario is the only way
      // a state's phase can flip to `custom` outside of a bake/simulate job
      // -- mirrors the `PathwayChildScenario.parse(scenario)` gate in the
      // backend's PUT /all-inputs (inputs.py), which only calls
      // `record_custom_state` in that same case (see OverviewCard's
      // PathwayViewerRow, which used to poll /pathways/overview every 5s to
      // catch exactly this). Invalidating here instead means the mini
      // timeline updates right when the edit happens, with no background
      // polling and no backend changes needed.
      if (childScenario?.year) {
        await queryClient.invalidateQueries({
          queryKey: pathwayOverviewQueryKey(scenario),
        });
      }
      console.log('success');
    },
    onError: () => {
      console.log('error');
    },
  });
}
