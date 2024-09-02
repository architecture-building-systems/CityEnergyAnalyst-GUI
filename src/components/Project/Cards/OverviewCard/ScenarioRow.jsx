import { PlusCircleOutlined } from '@ant-design/icons';
import { animated } from '@react-spring/web';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import { useDispatch } from 'react-redux';
import { useHoverGrow } from './hooks';
import { useOpenScenario } from '../../Project';

const ScenarioRow = ({ project, scenarioName, scenarioList }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {scenarioName ? scenarioName : 'No Scenario selected'}
          <div style={{ fontSize: 20 }}>
            <NewScenarioIcon />
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0 16px',
          gap: 8,
          maxHeight: 100,
          overflow: 'auto',
        }}
      >
        {scenarioList.map((scenario) => (
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
    <button key={scenario} onClick={handleOpenScenario}>
      {scenario}
    </button>
  );
};

const NewScenarioIcon = () => {
  const dispatch = useDispatch();
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const onClick = () => dispatch(push(routes.CREATE_SCENARIO));

  return (
    <animated.div
      style={styles}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <PlusCircleOutlined onClick={onClick} />
    </animated.div>
  );
};

export default ScenarioRow;
