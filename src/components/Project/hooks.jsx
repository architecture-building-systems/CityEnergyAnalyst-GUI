import routes from '../../constants/routes.json';
import { useChangeRoute } from '../../utils/hooks';
import { saveProjectToLocalStorage, useProjectStore } from './store';
import axios from 'axios';
import { message } from 'antd';
import { useEffect, useState } from 'react';

const updateConfigProjectInfo = async (project, scenarioName) => {
  try {
    const resp = await axios.put(
      `${import.meta.env.VITE_CEA_URL}/api/project/`,
      {
        project,
        scenario_name: scenarioName,
      },
    );
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

export const useFetchProjectChoices = () => {
  const [choices, setChoices] = useState();

  const fetchInfo = async () => {
    try {
      const resp = await axios.get(
        `${import.meta.env.VITE_CEA_URL}/api/project/choices`,
      );
      const _choices = resp.data?.projects;
      setChoices(_choices);
    } catch (err) {
      console.error(err?.response?.data);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  return choices;
};
