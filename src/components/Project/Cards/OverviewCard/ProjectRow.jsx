import OpenProjectModal from '../../OpenProjectModal';
import { useState } from 'react';

import NewProjectModal from '../../NewProjectModal';
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
      <div className="cea-card-icon-button-container">
        <RefreshIconButton />
        <OpenProjectIconButton />
        <NewProjectIconButton />
      </div>
    </div>
  );
};

const OpenProjectIconButton = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Tooltip title="Open Project">
        <OpenProjectIcon onClick={() => setVisible(true)} />
      </Tooltip>
      <OpenProjectModal visible={visible} setVisible={setVisible} />
    </>
  );
};

const NewProjectIconButton = () => {
  const [visible, setVisible] = useState(false);

  const onSuccess = () => {};

  return (
    <>
      <Tooltip title="New Project">
        <CreateNewIcon onClick={() => setVisible(true)} />
      </Tooltip>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </>
  );
};

const RefreshIconButton = () => {
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
    <Tooltip title="Refresh">
      <RefreshIcon onClick={onRefresh} />
    </Tooltip>
  );
};

export default ProjectRow;
