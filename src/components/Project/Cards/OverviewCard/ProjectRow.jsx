import { FolderOpenOutlined, PlusCircleOutlined } from '@ant-design/icons';
import OpenProjectModal from '../../OpenProjectModal';
import { useState } from 'react';

import { animated } from '@react-spring/web';
import NewProjectModal from '../../NewProjectModal';
import { useHoverGrow } from './hooks';
import { Tooltip } from 'antd';

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
        <OpenProjectIcon />
        <NewProjectIcon />
      </div>
    </div>
  );
};

const OpenProjectIcon = () => {
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
        <FolderOpenOutlined onClick={() => setVisible(true)} />
      </animated.div>
      <OpenProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </Tooltip>
  );
};

const NewProjectIcon = () => {
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
        <PlusCircleOutlined onClick={() => setVisible(true)} />
      </animated.div>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </Tooltip>
  );
};

export default ProjectRow;
