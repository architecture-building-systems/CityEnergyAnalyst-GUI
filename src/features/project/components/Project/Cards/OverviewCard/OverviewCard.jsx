import { Divider } from 'antd';
import ProjectRow from './ProjectRow';
import ScenarioRow from './ScenarioRow';
import { ShowHideCardsButton } from 'components/ShowHideCardsButton';

import CeaLogoSVG from 'assets/cea-logo.svg';

const OverviewCard = ({
  project,
  projectName,
  scenarioName,
  scenarioList,
  onToggleHideAll,
}) => {
  return (
    <div
      id="cea-overview-card"
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',

        display: 'flex',
        flexDirection: 'column',
        gap: 8,

        fontSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Logo height={48} />
        </div>

        <ShowHideCardsButton
          hideAll={true}
          onToggle={onToggleHideAll}
          style={{
            background: '#fff',
            color: '#000',
            padding: 0,
            borderRadius: 0,
          }}
        />
      </div>
      <OverviewCardProjectInfo
        project={project}
        projectName={projectName}
        scenarioName={scenarioName}
        scenarioList={scenarioList}
      />
    </div>
  );
};

const OverviewCardProjectInfo = ({
  project,
  projectName,
  scenarioName,
  scenarioList,
}) => {
  if (!project) return null;

  return (
    <>
      <ProjectRow projectName={projectName} />
      <Divider
        orientation="right"
        orientationMargin={2}
        plain
        style={{ margin: 0, fontSize: 12, color: 'rgba(5, 5, 5, 0.25)' }}
      >
        Scenario
      </Divider>
      <ScenarioRow
        project={project}
        scenarioName={scenarioName}
        scenarioList={scenarioList}
      />
    </>
  );
};

const Logo = ({ height }) => {
  return (
    <div
      id="cea-overview-card-logo"
      style={{
        display: 'flex',
        alignItems: 'center',
        height,
        gap: 12,
      }}
    >
      <CeaLogoSVG style={{ height: '100%' }} />
    </div>
  );
};

export default OverviewCard;
