import { Divider } from 'antd';
import ceaLogo from '../../../../assets/cea-logo.png';
import ProjectRow from './ProjectRow';
import ScenarioRow from './ScenarioRow';

const OverviewCard = ({ project, projectName, scenarioName, scenarioList }) => {
  return (
    <div
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',
        height: '100%',

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
