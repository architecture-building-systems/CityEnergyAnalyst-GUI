import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { FolderOpenOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import NewProjectModal from '../Project/NewProjectModal';
import OpenProjectModal from '../Project/OpenProjectModal';
import routes from '../../constants/routes.json';
import ceaLogo from '../../assets/cea-logo-name.png';

const Landing = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        margin: '10% 0',
        width: '100%',
      }}
    >
      <img src={ceaLogo} style={{ width: 350 }} alt="CEA Logo" />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: 350,
        }}
      >
        <NewProjectModalButton />
        <OpenProjectModalButton />
      </div>
    </div>
  );
};

const NewProjectModalButton = () => {
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
        <PlusOutlined />
        New Project
      </Button>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={goToProjectPage}
      />
    </>
  );
};

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

export default Landing;
