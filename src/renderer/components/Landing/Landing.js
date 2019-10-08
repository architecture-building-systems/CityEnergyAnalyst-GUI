import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { remote } from 'electron';
import { Button, Icon } from 'antd';
import axios from 'axios';
import { getStatic } from '../../utils/static';
import NewProjectModal from '../Project/NewProjectModal';
import { getProject } from '../../actions/project';
import routes from '../../constants/routes';

const logo = getStatic('cea-logo.png');

const Landing = () => {
  const [visible, setVisible] = useState(false);
  const dispatch = useDispatch();
  const rootPath =
    require('os').platform == 'win32'
      ? process.cwd().split(require('path').sep)[0]
      : '/';

  const goToProjectPage = async () => {
    await dispatch(getProject);
    dispatch(push(routes.PROJECT_OVERVIEW));
  };

  const openDialog = () => {
    const options = {
      properties: ['openDirectory']
    };
    remote.dialog.showOpenDialog(
      remote.getCurrentWindow(),
      options,
      async paths => {
        if (paths.length) {
          try {
            const resp = await axios.put(`http://localhost:5050/api/project/`, {
              path: paths[0]
            });
            console.log(resp.data);
            goToProjectPage();
          } catch (err) {
            console.log(err.response);
          }
        }
      }
    );
  };

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
          onClick={() => setVisible(true)}
        >
          <Icon type="plus" />
          New Project
        </Button>
        <Button
          type="primary"
          style={{ width: 300, margin: 24 }}
          onClick={openDialog}
        >
          <Icon type="folder-open" />
          Open Project
        </Button>
      </div>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        project={{ path: require('path').join(rootPath, 'null') }}
        onSuccess={goToProjectPage}
      />
    </React.Fragment>
  );
};

export default Landing;
