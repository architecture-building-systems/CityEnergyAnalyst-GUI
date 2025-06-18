import OpenProjectModal from '../../OpenProjectModal';
import { useState } from 'react';

import { animated } from '@react-spring/web';
import NewProjectModal from '../../NewProjectModal';
import { useHoverGrow } from './hooks';
import { message, Tooltip } from 'antd';
import {
  CreateNewIcon,
  OpenProjectIcon,
  RefreshIcon,
} from '../../../../assets/icons';
import { useProjectStore } from '../../store';
import { useOpenScenario } from '../../hooks';
import { useInputs } from '../../../../hooks/queries/useInputs';
import { useChangesExist } from '../../../InputEditor/store';
import { useMapStore } from '../../../Map/store/store';

const ProjectRow = ({ projectName }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
        }}
      >
        {':'}
        <b>{projectName}</b>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 20 }}>
        <RefreshIconButton />
        <OpenProjectIconButton />
        <NewProjectIconButton />
      </div>
    </div>
  );
};

const OpenProjectIconButton = () => {
  const [visible, setVisible] = useState(false);
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  return (
    <Tooltip title="Open Project" styles={{ body: { fontSize: 12 } }}>
      <animated.div
        style={styles}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <OpenProjectIcon onClick={() => setVisible(true)} />
      </animated.div>
      <OpenProjectModal visible={visible} setVisible={setVisible} />
    </Tooltip>
  );
};

const NewProjectIconButton = () => {
  const [visible, setVisible] = useState(false);
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const onSuccess = () => {};

  return (
    <Tooltip title="New Project" styles={{ body: { fontSize: 12 } }}>
      <animated.div
        style={styles}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <CreateNewIcon onClick={() => setVisible(true)} />
      </animated.div>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </Tooltip>
  );
};

const RefreshIconButton = () => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  const changes = useChangesExist();

  const { refetch } = useInputs();

  const openScenario = useOpenScenario();

  const onRefresh = () => {
    if (changes) {
      message.config({
        top: 120,
        maxCount: 1,
      });
      message.warning(
        <div style={{ padding: 8 }}>
          Failed to refresh project.
          <br />
          <i>Save or discard changes before refreshing.</i>
        </div>,
      );
      return;
    }

    // FIXME: Implement scenario refresh
    if (scenarioName) {
      openScenario(project, scenarioName).then((exists) => {
        if (exists) refetch().then(resetCameraOptions);
      });
    } else {
      // Otherwise, refresh project
      fetchInfo(project);
    }
  };

  return (
    <Tooltip title="Refresh" styles={{ body: { fontSize: 12 } }}>
      <animated.div
        style={styles}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <RefreshIcon onClick={onRefresh} />
      </animated.div>
    </Tooltip>
  );
};

export default ProjectRow;
