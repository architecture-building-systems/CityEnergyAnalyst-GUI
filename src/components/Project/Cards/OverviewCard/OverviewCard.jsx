import { Divider, Dropdown } from 'antd';
import ceaLogo from '../../../../assets/cea-logo.png';
import ProjectRow from './ProjectRow';
import ScenarioRow from './ScenarioRow';
import { ShowHideCardsButton } from '../../../../containers/Project';
import { helpMenuItems, HelpMenuItemsLabel, helpMenuUrls } from './constants';
import { DownOutlined } from '@ant-design/icons';
import { useMemo } from 'react';

const OverviewCard = ({
  project,
  projectName,
  scenarioName,
  scenarioList,
  onToggleHideAll,
}) => {
  const menuItems = useMemo(
    () =>
      helpMenuItems.map((item) => {
        const { label, key } = item;
        const url = helpMenuUrls[key];

        return {
          ...item,
          label: <HelpMenuItemsLabel url={url} name={label} />,
        };
      }),
    [],
  );

  return (
    <div
      id="cea-overview-card"
      style={{
        background: '#fff',
        padding: 12,
        paddingBottom: 18,
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',
        height: '100%',

        display: 'flex',
        flexDirection: 'column',
        gap: 12,

        fontSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Logo height={60} />

          <Dropdown menu={{ items: menuItems }}>
            <DownOutlined />
          </Dropdown>
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
    </div>
  );
};

export default OverviewCard;
