import { Suspense, lazy, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FolderOpenOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Card, Button, message } from 'antd';
import { updateScenario } from '../../actions/project';
import axios from 'axios';
import ScenarioCard from './ScenarioCard';
import routes from '../../constants/routes.json';
import './Project.css';
import { useChangeRoute, useFetchProject } from '../../utils/hooks';

const NewProjectModal = lazy(() => import('./NewProjectModal'));
const OpenProjectModal = lazy(() => import('./OpenProjectModal'));

const Project = () => {
  const { isFetching, error, info } = useSelector((state) => state.project);

  const {
    project,
    project_name: projectName,
    scenario_name: scenarioName,
    scenarios_list: scenariosList,
  } = info;
  const projectExists = !error && projectName !== '';
  const projectTitle = projectExists ? projectName : 'No Project found';

  return (
    <div className="cea-project">
      <Card
        bordered={false}
        title={
          <div className="cea-project-title-bar">
            <h2>{projectTitle}</h2>
            <div className="cea-project-options" style={{ paddingBottom: 18 }}>
              <NewProjectButton />
              <OpenProjectButton />
              <RefreshProjectButton
                project={project}
                scenarioName={scenarioName}
                loading={isFetching}
              />
            </div>
          </div>
        }
      >
        {projectExists && (
          <>
            <NewScenarioButton project={project} />
            {!scenariosList.length ? (
              <p style={{ textAlign: 'center', margin: 20 }}>
                No scenarios found
              </p>
            ) : scenarioName === null ? (
              <p style={{ textAlign: 'center', margin: 20 }}>
                No scenario currently selected
              </p>
            ) : null}
            {scenariosList.map((scenario) => (
              <ScenarioCard
                key={`${projectName}-${scenario}`}
                scenarioName={scenario}
                project={project}
                active={scenario == scenarioName}
              />
            ))}
          </>
        )}
      </Card>
    </div>
  );
};

const NewProjectButton = ({ onSuccess }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Button
        icon={<PlusOutlined />}
        size="small"
        onClick={() => setModalVisible(true)}
      >
        Create Project
      </Button>
      <Suspense>
        <NewProjectModal
          visible={isModalVisible}
          setVisible={setModalVisible}
          onSuccess={onSuccess}
        />
      </Suspense>
    </>
  );
};

const OpenProjectButton = ({ onSuccess = () => {} }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <>
      <Button
        icon={<FolderOpenOutlined />}
        size="small"
        onClick={() => setModalVisible(true)}
      >
        Open Project
      </Button>
      <Suspense>
        <OpenProjectModal
          visible={isModalVisible}
          setVisible={setModalVisible}
          onSuccess={onSuccess}
        />
      </Suspense>
    </>
  );
};

const RefreshProjectButton = ({ loading, project, scenarioName }) => {
  const fetchProject = useFetchProject();
  const dispatch = useDispatch();

  const refreshProject = () => {
    fetchProject(project).then(({ scenarios_list: scenariosList }) => {
      // Set scenario back if it exists
      if (scenariosList.includes(scenarioName))
        dispatch(updateScenario(scenarioName));
    });
  };

  return (
    <Button
      icon={<SyncOutlined />}
      size="small"
      onClick={refreshProject}
      loading={loading}
    >
      Refresh
    </Button>
  );
};

const NewScenarioButton = ({ project }) => {
  const changeRoute = useChangeRoute(routes.CREATE_SCENARIO);
  return (
    <>
      <Button
        type="primary"
        style={{
          display: 'block',
          width: '100%',
        }}
        onClick={changeRoute}
      >
        <PlusOutlined />
        Create Scenario
      </Button>
    </>
  );
};

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

export const deleteScenario = async (
  scenario,
  project,
  onSuccess = () => {},
) => {
  try {
    console.log(`About to delete scenario ${scenario}`);
    const resp = await axios.delete(
      `${import.meta.env.VITE_CEA_URL}/api/project/scenario/${scenario}`,
      {
        // apparently we can send a payload here: https://stackoverflow.com/a/58234086/2260
        data: { project: project },
      },
    );
    console.log(resp.data);
    onSuccess();
  } catch (err) {
    console.log(`Failed to delete scenario ${scenario}`);
    console.error(err.response);
  }
};

export const useOpenScenario = (route = routes.INPUT_EDITOR) => {
  const fetchProject = useFetchProject();
  const changeRoute = useChangeRoute(route);
  return async (project, scenarioName) => {
    // Fetch project info first before going to route
    const { scenarios_list: scenariosList } =
      await fetchProjectDetails(project);
    // Check if scenario still exist
    if (scenariosList.includes(scenarioName)) {
      await updateConfigProjectInfo(project, scenarioName);
      return fetchProject().then(changeRoute);
    } else {
      fetchProject(project).then(() => {
        message.config({
          top: 120,
        });
        message.error(
          <span>
            Scenario: <b>{scenarioName}</b> could not be found.
          </span>,
        );
      });
    }
  };
};

const fetchProjectDetails = async (project = null) => {
  console.log(
    `fetchProjectDetails: ${project} - url: ${import.meta.env.VITE_CEA_URL}`,
  );
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

export const useFetchConfigProjectInfo = () => {
  const [info, setInfo] = useState({});

  const fetchInfo = async () => {
    const projectDetails = await fetchProjectDetails();
    setInfo(projectDetails);
  };

  return { info, fetchInfo };
};

export default Project;
