import { Divider } from 'antd';
import ceaLogo from '../../../../assets/cea-logo.png';
import { useSelector } from 'react-redux';
import ProjectRow from './ProjectRow';
import ScenarioRow from './ScenarioRow';

const OverviewCard = () => {
  const {
    project,
    project_name: projectName,
    scenario_name: scenarioName,
    scenarios_list: scenarioList,
  } = useSelector((state) => state.project.info);

  return (
    <div
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        width: 250,

        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Logo height={55} />
      <Divider style={{ margin: 0 }} />
      <ProjectRow projectName={projectName} />
      <Divider style={{ margin: 0 }} />
      <ScenarioRow
        project={project}
        scenarioName={scenarioName}
        scenarioList={scenarioList}
      />
    </div>
  );
};

const Logo = ({ height }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height,
        gap: 12,
      }}
    >
      <img style={{ height: '100%' }} src={ceaLogo} alt="Logo" />
      <span style={{ fontSize: '1em', fontWeight: 600 }}>
        City Energy Analyst
      </span>
    </div>
  );
};

export default OverviewCard;
