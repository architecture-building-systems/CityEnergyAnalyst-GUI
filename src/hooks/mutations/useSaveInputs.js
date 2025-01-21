import { apiClient } from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useProjectStore } from '../../components/Project/store';
import {
  useChanges,
  useDiscardChanges,
} from '../../components/InputEditor/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useResyncInputs } from '../updates/useUpdateInputs';

const saveChanges = () => async (dispatch, getState) => {
  const { tables, geojsons, crs, schedules } = getState().inputData;
  return apiClient.put(`${API_ENDPOINTS.INPUTS}/all-inputs`, {
    tables,
    geojsons,
    crs,
    schedules,
  });
};

export function useSaveInputs() {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const changes = useChanges();
  const discardChanges = useDiscardChanges();
  const resyncInputs = useResyncInputs();

  const { tables, geojsons, crs } = queryClient.getQueryData([
    'inputs',
    projectName,
    scenarioName,
  ]);

  console.log(changes);

  const schedules = {};

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
      discardChanges();
      resyncInputs();
      console.log('success');
    },
    onError: () => {
      console.log('error');
    },
  });
}
