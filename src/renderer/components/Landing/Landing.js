import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { Button, Icon } from 'antd';
import getStatic from '../../utils/static';
import NewProjectModal from '../Project/NewProjectModal';
import OpenProjectModal from '../Project/OpenProjectModal';
import routes from '../../constants/routes';

const logo = getStatic('cea-logo.png');

const Landing = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <img src={logo} style={{ width: '15%', minWidth: 100 }} alt="CEA Logo" />
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
    <React.Fragment>
      <Button
        type="primary"
        style={{ width: 300, margin: 24 }}
        onClick={() => setVisible(true)}
      >
        <Icon type="plus" />
        New Project
      </Button>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={goToProjectPage}
      />
    </React.Fragment>
  );
};

const OpenProjectModalButton = () => {
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();

  const goToProjectPage = () => {
    dispatch(push(routes.PROJECT_OVERVIEW));
  };

  return (
    <React.Fragment>
      <Button
        type="primary"
        style={{ width: 300, margin: 24 }}
        onClick={() => setVisible(true)}
      >
        <Icon type="folder-open" />
        Open Project
      </Button>
      <OpenProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={goToProjectPage}
      />
    </React.Fragment>
  );
};

export default Landing;
