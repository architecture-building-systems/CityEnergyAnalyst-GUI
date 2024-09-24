import { animated } from '@react-spring/web';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import { useDispatch } from 'react-redux';
import { useHoverGrow } from './hooks';
import { useOpenScenario } from '../../Project';
import { useMemo } from 'react';
import { Tooltip } from 'antd';
import { CreateNewIcon, DuplicateIcon } from '../../../../assets/icons';

import './OverviewCard.css';

const ScenarioRow = ({ project, scenarioName, scenarioList }) => {
  const remainingScenarios = useMemo(() => {
    return scenarioList.filter((scenario) => scenario !== scenarioName).sort();
  }, [scenarioList, scenarioName]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,

        fontSize: 14,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: '#000',
            padding: '10px 12px',
            borderRadius: 12,
            color: '#fff',

            fontWeight: 'bold',

            flexGrow: 1,
          }}
        >
          {scenarioName ? scenarioName : 'Select Scenario'}
        </div>
        <div style={{ fontSize: 20, display: 'flex', gap: 8 }}>
          <DuplicateScenarioIcon />
          <NewScenarioIcon />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {remainingScenarios.map((scenario) => (
          <ScenarioItem key={scenario} project={project} scenario={scenario} />
        ))}
      </div>
    </div>
  );
};

const ScenarioItem = ({ project, scenario }) => {
  const openScenario = useOpenScenario(routes.PROJECT);
  const handleOpenScenario = () => openScenario(project, scenario);

  return (
    <div
      className="cea-card-scenario-item"
      key={scenario}
      onClick={handleOpenScenario}
    >
      {scenario}
    </div>
  );
};

const NewScenarioIcon = () => {
  const dispatch = useDispatch();
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const onClick = () => dispatch(push(routes.CREATE_SCENARIO));

  return (
    <Tooltip
      title="New Scenario"
      placement="bottom"
      overlayInnerStyle={{ fontSize: 12 }}
    >
      <animated.div
        style={styles}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <CreateNewIcon onClick={onClick} />
      </animated.div>
    </Tooltip>
  );
};

const DuplicateScenarioIcon = () => {
  const dispatch = useDispatch();
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const onClick = () => {};

  return (
    <Tooltip
      title="Duplicate Scenario"
      placement="bottom"
      overlayInnerStyle={{ fontSize: 12 }}
    >
      <animated.div
        style={styles}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <DuplicateIcon onClick={onClick} />
      </animated.div>
    </Tooltip>
  );
};

export default ScenarioRow;
