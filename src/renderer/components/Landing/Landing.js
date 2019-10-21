import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { Button, Icon } from 'antd';
import getStatic from '../../utils/static';
import NewProjectModal from '../Project/NewProjectModal';
import OpenProjectModal from '../Project/OpenProjectModal';
import { getProject } from '../../actions/project';
import routes from '../../constants/routes';

const logo = getStatic('cea-logo.png');

const Landing = () => {
  const { info } = useSelector(state => state.project);
  const [visibleNew, setNewVisible] = useState(false);
  const [visibleOpen, setOpenVisible] = useState(false);
  const dispatch = useDispatch();
  const rootPath =
    require('os').platform == 'win32'
      ? process.cwd().split(require('path').sep)[0]
      : '/';

  const goToProjectPage = async () => {
    await dispatch(getProject());
    dispatch(push(routes.PROJECT_OVERVIEW));
  };

  // Get Project Details on mount
  useEffect(() => {
    dispatch(getProject());
  }, []);

  return (
    <React.Fragment>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <img
          src={logo}
          style={{ width: '15%', minWidth: 100 }}
          alt="CEA Logo"
        />
        <h2 style={{ fontSize: '2em', margin: 30 }}>City Energy Analyst</h2>
        <Button
          type="primary"
          style={{ width: 300, margin: 24 }}
          onClick={() => setNewVisible(true)}
        >
          <Icon type="plus" />
          New Project
        </Button>
        <Button
          type="primary"
          style={{ width: 300, margin: 24 }}
          onClick={() => setOpenVisible(true)}
        >
          <Icon type="folder-open" />
          Open Project
        </Button>
      </div>
      <NewProjectModal
        visible={visibleNew}
        setVisible={setNewVisible}
        project={{ path: require('path').join(rootPath, 'null') }}
        onSuccess={goToProjectPage}
      />
      <OpenProjectModal
        visible={visibleOpen}
        setVisible={setOpenVisible}
        project={info}
        onSuccess={goToProjectPage}
      />
    </React.Fragment>
  );
};

export default Landing;
