import { Suspense, lazy, useState } from 'react';
import {
  FolderOpenOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Card, Button } from 'antd';
import axios from 'axios';
import ScenarioCard from './ScenarioCard';
import routes from '../../constants/routes.json';
import './Project.css';
import { useChangeRoute } from '../../utils/hooks';
import { useProjectStore } from './store';

const NewProjectModal = lazy(() => import('./NewProjectModal'));
const OpenProjectModal = lazy(() => import('./OpenProjectModal'));

const Project = () => {
  const {
    isFetching,
    error,
    project,
    name: projectName,
    scenarioName,
    scenariosList,
  } = useProjectStore();

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

const OpenProjectButton = ({ onSuccess }) => {
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
  const fetchProject = useProjectStore((state) => state.fetchInfo);
  const updateScenario = useProjectStore((state) => state.updateScenario);

  const refreshProject = async () => {
    const projectInfo = await fetchProject(project);
    const scenariosList = projectInfo?.scenarios_list || [];

    // Set scenario back if it exists
    if (scenariosList.includes(scenarioName)) updateScenario(scenarioName);
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

const NewScenarioButton = () => {
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

export default Project;
