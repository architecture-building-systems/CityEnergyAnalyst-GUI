import { Button } from 'antd';
import { push } from 'connected-react-router';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

import routes from '../../../constants/routes.json';
import { FolderOpenOutlined } from '@ant-design/icons';
import OpenProjectModal from '../../Project/OpenProjectModal';

const OpenProjectModalButton = () => {
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();

  const goToProjectPage = () => {
    dispatch(push(routes.PROJECT_OVERVIEW));
  };

  return (
    <>
      <Button
        type="primary"
        style={{ width: '100%' }}
        onClick={() => setVisible(true)}
      >
        <FolderOpenOutlined />
        Open Project
      </Button>
      <OpenProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={goToProjectPage}
      />
    </>
  );
};

export default OpenProjectModalButton;
