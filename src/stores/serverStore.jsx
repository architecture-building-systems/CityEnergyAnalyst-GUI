import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';
import { useProjectStore } from 'features/project/stores/projectStore';

const useServerStore = create((set) => ({
  limits: null,

  fetchLimits: async () => {
    try {
      const { data } = await apiClient.get('/server/settings');
      set({ limits: data?.limits });
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  },
}));

export const useProjectLimits = () => {
  const projectLimit = useServerStore((state) => state.limits?.num_projects);
  const numProjects = useProjectStore(
    (state) => state.projectChoices?.length ?? 0,
  );

  return { limit: projectLimit, count: projectLimit - numProjects };
};

export const useScenarioLimits = () => {
  const scenarioLimit = useServerStore((state) => state.limits?.num_scenarios);

  // FIXME: Consider when uploading to other project
  const numScenarios = useProjectStore(
    (state) => state.scenariosList?.length ?? 0,
  );

  return { limit: scenarioLimit, count: scenarioLimit - numScenarios };
};

export const useBuildingLimits = (numBuildings) => {
  const buildingLimit = useServerStore((state) => state.limits?.num_buildings);
  return { limit: buildingLimit, count: buildingLimit - numBuildings };
};

export const useFetchServerLimits = () =>
  useServerStore((state) => state.fetchLimits);

export default useServerStore;
