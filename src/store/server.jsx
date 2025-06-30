import { create } from 'zustand';
import { apiClient } from '../api/axios';
import { useProjectStore } from '../components/Project/store';

const useServerStore = create((set) => ({
  limits: null,

  fetchLimits: async () => {
    try {
      const { data } = await apiClient.get('/server/settings');
      console.log(data);
      set({ limits: data?.limits });
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  },
}));

export const useProjectLimits = () => {
  const projectLimit = useServerStore(
    (state) => state.limits?.num_projects ?? 0,
  );
  const numProjects = useProjectStore(
    (state) => state.projectChoices?.length ?? 0,
  );

  return { limit: projectLimit, count: projectLimit - numProjects };
};

export const useScenarioLimits = () => {
  const scenarioLimit = useServerStore(
    (state) => state.limits?.num_scenarios ?? 0,
  );
  const numScenarios = useProjectStore(
    (state) => state.scenariosList?.length ?? 0,
  );

  return { limit: scenarioLimit, count: scenarioLimit - numScenarios };
};

export const useFetchServerLimits = () =>
  useServerStore((state) => state.fetchLimits);

export default useServerStore;
