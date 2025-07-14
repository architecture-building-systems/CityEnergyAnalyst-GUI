import { useProjectStore } from 'features/project/stores/projectStore';
import RecentProjects from 'features/project/components/Project/RecentProjects';
import ProjectOverlay from 'features/project/components/ProjectOverlay';
import InputMap from 'features/project/components/InputMap';
import ScenarioAlert from 'components/ScenarioAlert';

import './Project.css';

const Project = () => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);

  return (
    <div style={{ height: '100%', background: '#f0f2f8' }}>
      <ProjectOverlay project={project} scenarioName={scenarioName} />

      <InputMap project={project} scenario={scenarioName} />

      {!project ? <RecentProjects /> : !scenarioName && <ScenarioAlert />}
    </div>
  );
};

export default Project;
