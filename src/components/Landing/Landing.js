import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { FolderOpenOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import NewProjectModal from '../Project/NewProjectModal';
import OpenProjectModal from '../Project/OpenProjectModal';
import routes from '../../constants/routes';
import ceaLogo from '../../assets/react.svg';

const Landing = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <img
        src={ceaLogo}
        style={{ width: '15%', minWidth: 100 }}
        alt="CEA Logo"
      />
      <h2 style={{ fontSize: '2em', margin: 30 }}>City Energy Analyst</h2>
      <NewProjectModalButton />
      <OpenProjectModalButton />
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
        style={{ width: 300, margin: 24 }}
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
        style={{ width: 300, margin: 24 }}
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
