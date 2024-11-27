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
import { useOpenScenario } from '../../Project';
import { useDispatch, useSelector } from 'react-redux';
import {
  discardChanges,
  fetchInputData,
} from '../../../../actions/inputEditor';
import { useFetchProject } from '../../../../utils/hooks';

const ProjectRow = ({ projectName }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <b>{projectName}</b>
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

  const onSuccess = async ({ project }) => {};

  return (
    <Tooltip title="Open Project" overlayInnerStyle={{ fontSize: 12 }}>
      <animated.div
        style={styles}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <OpenProjectIcon onClick={() => setVisible(true)} />
      </animated.div>
      <OpenProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </Tooltip>
  );
};

const NewProjectIconButton = () => {
  const [visible, setVisible] = useState(false);
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const onSuccess = () => {};

  return (
    <Tooltip title="New Project" overlayInnerStyle={{ fontSize: 12 }}>
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

  const { info } = useSelector((state) => state.project);
  const changes = useSelector(
    (state) =>
      Object.keys(state.inputData?.changes?.delete).length > 0 ||
      Object.keys(state.inputData?.changes?.update).length > 0,
  );
  const { project, scenario_name: scenarioName } = info;

  const dispatch = useDispatch();
  const fetchProject = useFetchProject();
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

    // Refresh scenario if scenario name is given
    if (scenarioName) {
      openScenario(project, scenarioName).then((exists) => {
        if (exists) dispatch(fetchInputData());
      });
    } else {
      // Otherwise, refresh project
      fetchProject(project);
    }
  };

  return (
    <Tooltip title="Refresh" overlayInnerStyle={{ fontSize: 12 }}>
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
