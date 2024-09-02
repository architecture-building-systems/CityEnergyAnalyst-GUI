import axios from 'axios';
import { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projectInfo, setProjectInfo] = useState({
    project: null,
    activeScenario: null,
    scenarios: [],
  });

  // Initialize global state or data here
  const globalState = {
    projectInfo,
    setProjectInfo,
  };

  return (
    <ProjectContext.Provider value={globalState}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useFetchProjectInfo = () => {
  const { projectInfo } = useContext(ProjectContext);

  fetchProjectDetails;

  return projectInfo;
};

export const useUpdateProjectInfo = () => {
  const { projectInfo, setProjectInfo } = useContext(ProjectContext);

  const updateProjectInfo = (project, scenarioName) => {
    setProjectInfo({
      ...projectInfo,
      project,
      activeScenario: scenarioName,
      scenarios: [],
    });
  };

  return updateProjectInfo;
};

export const useProjectContext = () => {
  return useContext(ProjectContext);
};

const fetchProjectDetails = async (project) => {
  const config = project ? { params: { project } } : {};
  try {
    const resp = await axios.get(
      `${import.meta.env.VITE_CEA_URL}/api/project/`,
      config,
    );
    console.log(`fetchProjectDetails: resp.data=${resp.data}`);
    return resp.data;
  } catch (err) {
    console.error(err);
    console.error(err.response);
  }
};
