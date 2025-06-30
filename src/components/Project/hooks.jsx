import routes from '../../constants/routes.json';
import { useChangeRoute } from '../../utils/hooks';
import { useSaveProjectToLocalStorage, useProjectStore } from './store';
import { message } from 'antd';
import { apiClient } from '../../api/axios';

const updateConfigProjectInfo = async (project, scenarioName) => {
  try {
    const resp = await apiClient.put(`/api/project/`, {
      project,
      scenario_name: scenarioName,
    });
    console.log(resp.data);
    return resp.data;
  } catch (err) {
    console.error(err.response);
  }
};

export const useOpenScenario = (route = routes.PROJECT) => {
  const fetchProject = useProjectStore((state) => state.fetchInfo);
  const updateScenario = useProjectStore((state) => state.updateScenario);
  const changeRoute = useChangeRoute(route);

  const saveProjectToLocalStorage = useSaveProjectToLocalStorage();

  return async (project, scenarioName) => {
    console.log('Opening scenario', project, scenarioName);
    // Fetch project info first before going to route
    const { scenariosList } = await fetchProject(project);

    // Check if scenario still exist
    if (scenariosList.includes(scenarioName)) {
      // Save to config
      await updateConfigProjectInfo(project, scenarioName);
      // Change scenario
      updateScenario(scenarioName);
      // Save to localStorage
      saveProjectToLocalStorage(project, scenarioName);
      changeRoute();
      return true;
    } else {
      console.log('Scenario does not exist');
      message.config({
        top: 120,
      });
      message.error(
        <span>
          Scenario: <b>{scenarioName}</b> could not be found.
        </span>,
      );
      return false;
    }
  };
};
