import { apiClient } from '../../api/axios';
import { API_ENDPOINTS } from '../../api/endpoints';
import { useProjectStore } from '../../components/Project/store';

export function useSaveInputs() {
  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return () => {};
}
