import { animated } from '@react-spring/web';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import { useDispatch } from 'react-redux';
import { useHoverGrow } from './hooks';
import { useMemo } from 'react';
import { Badge, message, Tooltip } from 'antd';
import { CreateNewIcon, DuplicateIcon } from '../../../../assets/icons';

import './OverviewCard.css';
import { useOpenScenario } from '../../hooks';
import { useChangesExist } from '../../../InputEditor/store';

const ScenarioRow = ({ project, scenarioName, scenarioList }) => {
  const sortedScenarios = useMemo(() => {
    return scenarioList.sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [scenarioList]);

  const remainingScenarios = useMemo(() => {
    return sortedScenarios.filter((scenario) => scenario !== scenarioName);
  }, [sortedScenarios, scenarioName]);

  const changesExist = useChangesExist();

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
        <Badge dot styles={{ root: { flex: 1 } }} count={changesExist ? 1 : 0}>
          <div
            style={{
              backgroundColor: '#000',
              padding: '10px 12px',
              borderRadius: 12,
              color: '#fff',

              fontWeight: 'bold',
            }}
          >
            {scenarioName
              ? scenarioName
              : scenarioList?.length
                ? 'Select Scenario'
                : 'Create Scenario'}
          </div>
        </Badge>
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
  const changes = useChangesExist();

  const openScenario = useOpenScenario(routes.PROJECT);
  const handleOpenScenario = () => {
    if (changes) {
      message.config({
        top: 120,
      });
      message.warning(
        'Save or discard changes before opening another scenario.',
      );
      return;
    }
    openScenario(project, scenario);
  };

  return (
    <div
      className="cea-card-scenario-item"
      key={scenario}
      onClick={handleOpenScenario}
      onKeyDown={(e) => e.key === 'Enter' && handleOpenScenario()}
      role="button"
      tabIndex={0}
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
      styles={{ body: { fontSize: 12 } }}
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
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const onClick = () => {};

  return (
    <Tooltip
      title="Duplicate Scenario"
      placement="bottom"
      styles={{ body: { fontSize: 12 } }}
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
