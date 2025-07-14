import { useCallback, useEffect } from 'react';
import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';
import { useUserInfo } from 'stores/userStore';

const DEFAULT_PROJECT_PROPS = {
  project: 'reference-case-open',
  scenario: 'baseline',

  recentProjects: [],
};

export const fetchConfig = async () => {
  const response = await apiClient.get(`/api/project/config`);
  return response.data;
};

export const fetchProjectInfo = async (project) => {
  if (!project) throw new Error('Project cannot be empty');
  try {
    const { data } = await apiClient.get(`/api/project/`, {
      params: { project },
    });

    return data;
  } catch (error) {
    console.error('Error fetching project info:', error?.response?.data);
    throw error;
  }
};

export const deleteScenario = async (project, scenario) => {
  if (!project) throw new Error('Project cannot be empty');
  if (!scenario) throw new Error('Scenario cannot be empty');

  try {
    const { data } = await apiClient.delete(`/api/project/scenario`, {
      data: { project, scenario_name: scenario },
    });

    return data;
  } catch (error) {
    console.error(error?.response?.data);
    throw error;
  }
};

export const fetchProjectChoices = async () => {
  try {
    const { data } = await apiClient.get(`/api/project/choices`);

    return data;
  } catch (error) {
    console.error(error?.response?.data);
    throw error;
  }
};

// TODO: Handle errors when fetching project info e.g. path not found
export const useProjectStore = create((set) => ({
  name: null,
  project: null,
  scenario: null,
  scenariosList: [],
  projectChoices: null,

  isFetching: false,
  error: null,

  recentProjects: [],

  setProject: (project) => set({ project }),

  fetchInfo: async (project) => {
    set({ isFetching: true, error: null });
    try {
      const data = await fetchProjectInfo(project);
      const { name, scenarios_list: scenariosList } = data;

      const out = {
        name,
        project,
        scenariosList,
        isFetching: false,
      };
      set(out);
      return out;
    } catch (error) {
      set({ isFetching: false, error });
      throw error;
    }
  },
  fetchProjectChoices: async () => {
    try {
      const data = await fetchProjectChoices();
      const { projects } = data;

      set({ projectChoices: projects });
      return projects;
    } catch (error) {
      console.error('Error fetching project choices:', error);
      throw error;
    }
  },
  deleteScenario: async (project, scenario) => {
    try {
      const data = await deleteScenario(project, scenario);
      const { scenarios: scenariosList } = data;

      set({ scenariosList });
      return scenariosList;
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw error;
    }
  },
  updateScenario: (scenario) => set({ scenario }),
  setRecentProjects: (projects) => set({ recentProjects: projects }),
}));

export const useProjectLoading = () =>
  useProjectStore((state) => state.isFetching);

const getLocalStorageName = (userID) => {
  if (!userID) return 'cea-projects';
  return `cea-projects-${userID}`;
};

export const useSaveProjectToLocalStorage = () => {
  const userInfo = useUserInfo();

  const saveProjectToLocalStorage = useCallback(
    (project, scenario = null) => {
      const localStorageName = getLocalStorageName(userInfo?.id);

      // Update recent projects in localStorage
      const storedProject = JSON.parse(
        localStorage.getItem(localStorageName) ||
          JSON.stringify(DEFAULT_PROJECT_PROPS),
      );

      // Add project to recent projects if not already in the list
      if (
        Array.isArray(storedProject?.recentProjects) &&
        !storedProject.recentProjects.includes(project)
      ) {
        console.log('Adding project to recent projects:', project);
        storedProject.recentProjects = [
          project,
          ...storedProject.recentProjects.filter((p) => p !== project),
        ].slice(0, 10); // Keep only the 10 most recent
      }
      storedProject.project = project;

      if (scenario) {
        storedProject.scenario = scenario;
      }
      localStorage.setItem(localStorageName, JSON.stringify(storedProject));

      return storedProject;
    },
    [userInfo?.id],
  );

  return saveProjectToLocalStorage;
};

export const useRemoveProjectFromLocalStorage = () => {
  const userInfo = useUserInfo();

  const removeProjectFromLocalStorage = useCallback(
    (project) => {
      const localStorageName = getLocalStorageName(userInfo?.id);

      // Update recent projects in localStorage
      const storedProject = JSON.parse(
        localStorage.getItem(localStorageName) ||
          JSON.stringify(DEFAULT_PROJECT_PROPS),
      );

      // Remove project from recent projects if it exists
      if (
        Array.isArray(storedProject?.recentProjects) &&
        storedProject.recentProjects.includes(project)
      ) {
        console.log('Removing project from recent projects:', project);
        storedProject.recentProjects = storedProject.recentProjects.filter(
          (p) => p !== project,
        );
      }

      storedProject.project = null;
      storedProject.scenario = null;
      localStorage.setItem(localStorageName, JSON.stringify(storedProject));

      return storedProject;
    },
    [userInfo?.id],
  );

  return removeProjectFromLocalStorage;
};

export const useInitProjectStore = () => {
  // Require user info to be initialized before initializing project store
  const userInfo = useUserInfo();
  const userID = userInfo?.id;

  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const setRecentProjects = useProjectStore((state) => state.setRecentProjects);
  const updateScenario = useProjectStore((state) => state.updateScenario);

  useEffect(() => {
    const initializeProjectFromLocalStorage = async () => {
      const localStorageName = getLocalStorageName(userID);

      try {
        // Check localStorage for stored project and scenario
        const storedProject = JSON.parse(
          localStorage.getItem(localStorageName) ||
            JSON.stringify(DEFAULT_PROJECT_PROPS),
        );

        // Set recent projects
        if (Array.isArray(storedProject?.recentProjects)) {
          setRecentProjects(storedProject.recentProjects);
        } else {
          setRecentProjects([]);
        }

        // Try to fetch project info
        if (storedProject?.project) {
          console.log(
            'Loading project from localStorage:',
            storedProject.project,
          );
          const result = await fetchInfo(storedProject.project);

          // Set scenario if it exists
          if (
            storedProject?.scenario &&
            result?.scenariosList?.includes(storedProject.scenario)
          ) {
            updateScenario(storedProject.scenario);
          }

          return result;
        } else {
          console.log('No project in localStorage');
          return DEFAULT_PROJECT_PROPS;
        }
      } catch (error) {
        console.error('Error initializing project:', error);
        return DEFAULT_PROJECT_PROPS;
      }
    };

    if (userID) initializeProjectFromLocalStorage();
  }, [userID]);
};

export const useFetchProjectChoices = () => {
  const projectChoices = useProjectStore((state) => state.projectChoices);
  const fetchProjectChoices = useProjectStore(
    (state) => state.fetchProjectChoices,
  );

  useEffect(() => {
    fetchProjectChoices();
  }, []);

  return [projectChoices, fetchProjectChoices];
};
