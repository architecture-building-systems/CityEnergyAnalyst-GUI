import { apiClient } from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useProjectStore } from '../../stores/projectStore';
import { useChanges, useResetStore } from '../../stores/inputEditorStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResyncInputs } from '../updates/useUpdateInputs';

export function useSaveInputs() {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const changes = useChanges();
  const resetStore = useResetStore();
  const resyncInputs = useResyncInputs();

  const { tables, geojsons, crs } = queryClient.getQueryData([
    'inputs',
    projectName,
    scenarioName,
  ]);

  const schedules = Object.keys(changes.update?.schedules ?? {}).reduce(
    (obj, key) => {
      obj[key] = queryClient.getQueryData([
        'inputs',
        'building-schedule',
        key,
        projectName,
        scenarioName,
      ]);
      return obj;
    },
    {},
  );

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.put(
        `${API_ENDPOINTS.INPUTS}/all-inputs`,
        {
          tables,
          geojsons,
          crs,
          schedules,
        },
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
