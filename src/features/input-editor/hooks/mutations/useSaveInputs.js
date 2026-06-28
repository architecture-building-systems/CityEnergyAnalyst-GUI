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
import { useResyncInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';

export function useSaveInputs() {
  const queryClient = useQueryClient();

  const project = useProjectStore((state) => state.project);
  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);
  const childScenario = useProjectStore((state) => state.childScenario);

  const changes = useChanges();
  const resetStore = useResetStore();
  const resyncInputs = useResyncInputs();

  const childToken = childScenarioToken(childScenario);

  const { tables, geojsons, crs } =
    queryClient.getQueryData(['inputs', project, scenarioName, childToken]) ??
    {};

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

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.put(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        { tables, geojsons, crs, schedules },
        { headers: activeScenarioHeaders() },
      );
      return data;
    },
    onSuccess: () => {
      resetStore();
      resyncInputs();
      console.log('success');
    },
    onError: () => {
      console.log('error');
    },
  });
}
