import axios from 'axios';
import { useEffect } from 'react';
import { create } from 'zustand';

const fetchInfo = async (project) => {
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

  recentProjects: [],

  fetchInfo: async (project) => {
    console.log('Fetcthing project info', project);
    set({ isFetching: true, error: null });
    try {
      const { name, scenarios_list: scenariosList } = await fetchInfo(project);
      const out = {
        name,
        project,
        scenariosList,
        isFetching: false,
      };
      set(out);
      return out;
    } catch (error) {
      console.error('Error fetching project info:', error?.response?.data);
      set({ isFetching: false, error });

      throw error;
    }
  },

  updateScenario: (scenario) => {
    set({ scenario });
  },

  setRecentProjects: (projects) => {
    set({ recentProjects: projects });
  },
}));

export const useSettingsStore = create((set) => ({
  settings: {},
  setSettings: (value) => set({ settings: value }),
}));

const DEFAULT_PROJECT_PROPS = {
  project: null,
  scenario: null,

  recentProjects: [],
};

export const saveProjectToLocalStorage = (project) => {
  // Update recent projects in localStorage
  const storedProject = JSON.parse(
    localStorage.getItem('cea-projects') ||
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
  localStorage.setItem('cea-projects', JSON.stringify(storedProject));

  return storedProject;
};

export const removeProjectFromLocalStorage = (project) => {
  // Update recent projects in localStorage
  const storedProject = JSON.parse(
    localStorage.getItem('cea-projects') ||
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
  localStorage.setItem('cea-projects', JSON.stringify(storedProject));

  return storedProject;
};

export const useInitProjectStore = () => {
  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const setRecentProjects = useProjectStore((state) => state.setRecentProjects);
  const updateScenario = useProjectStore((state) => state.updateScenario);

  useEffect(() => {
    const initializeProjectFromLocalStorage = async () => {
      try {
        // Check localStorage for stored project and scenario
        const storedProject = JSON.parse(
          localStorage.getItem('cea-projects') ||
            JSON.stringify(DEFAULT_PROJECT_PROPS),
        );
        console.log('storedProject:', storedProject);

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

    initializeProjectFromLocalStorage();
  }, []);
};
