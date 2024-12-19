import axios from 'axios';
import { create } from 'zustand';

export const fetchInfo = async (project) => {
  if (!project) throw new Error('Project cannot be empty');

  const response = await axios.get(
    `${import.meta.env.VITE_CEA_URL}/api/project/`,
    {
      params: { project },
    },
  );
  return response.data;
};

export const fetchConfig = async () => {
  const response = await axios.get(
    `${import.meta.env.VITE_CEA_URL}/api/project/config`,
  );
  return response.data;
};

// TODO: Handle errors when fetching project info e.g. path not found
export const useProjectStore = create((set) => ({
  name: null,
  project: null,
  scenario: null,
  scenariosList: [],

  isFetching: false,
  error: null,

  updateScenario: (scenario) => {
    set({ scenario });
  },

  fetchConfig: async () => {
    console.log('Loading project state from config');
    try {
      const data = await fetchConfig();
      const { project, scenario } = data;
      set({
        project,
        scenario,
      });
      return data;
    } catch (error) {
      console.error(error);
      set({ error });
    }
  },
  fetchInfo: async (project) => {
    console.log('Updating project info state', project);
    set({ isFetching: true, error: null });
    try {
      const { name, scenarios_list: scenariosList } = await fetchInfo(project);
      set((state) => {
        // Set scenario to null if it does not exist in project
        const scenario = scenariosList.includes(state.scenario)
          ? state.scenario
          : null;
        return {
          name,
          project,
          scenario,
          scenariosList,
          isFetching: false,
        };
      });
      return { name, scenariosList };
    } catch (error) {
      console.error(error);
      set({ isFetching: false, error });
    }
  },
}));

export const useSettingsStore = create((set) => ({
  settings: {},
  setSettings: (value) => set({ settings: value }),
}));
