import OpenProjectModal from '../../OpenProjectModal';
import { useState } from 'react';

import NewProjectModal from '../../NewProjectModal';
import { Button, message, Tooltip } from 'antd';
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
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,

          outline: '1px solid #dddddd',
          width: '100%',

          padding: '10px 12px',
          borderRadius: 12,
        }}
      >
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
        <Button
          icon={<OpenProjectIcon />}
          type="text"
          onClick={() => setVisible(true)}
        />
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
        <Button
          icon={<CreateNewIcon />}
          type="text"
          onClick={() => setVisible(true)}
        />
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
  const [loading, setLoading] = useState(false);
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  const changes = useChangesExist();

  const { refetch } = useInputs();

  const openScenario = useOpenScenario();

  const onRefresh = async () => {
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

    try {
      setLoading(true);
      // FIXME: Implement scenario refresh
      if (scenarioName) {
        await openScenario(project, scenarioName).then((exists) => {
          if (exists) refetch().then(resetCameraOptions);
        });
      } else {
        // Otherwise, refresh project
        await fetchInfo(project);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Refresh">
      <Button
        icon={<RefreshIcon />}
        type="text"
        onClick={onRefresh}
        loading={loading}
      />
    </Tooltip>
  );
};

export default ProjectRow;
