import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { ipcRenderer, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  Card,
  Icon,
  Row,
  Col,
  Button,
  Popconfirm,
  Tag,
  Modal,
  Form
} from 'antd';
import axios from 'axios';
import { useAsyncData } from '../../utils/hooks';
import { getProject } from '../../actions/project';
import routes from '../../constants/routes';
import parameter from '../Tools/parameter';
import './Project.css';

const Project = () => {
  const { isFetching, error, info } = useSelector(state => state.project);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const dispatch = useDispatch();

  // Get Project Details on mount
  useEffect(() => {
    dispatch(getProject());
  }, []);

  // Setup ipcRenderer listener
  useEffect(() => {
    ipcRenderer.on('selected-project', async (event, path) => {
      try {
        const resp = await axios.put(`http://localhost:5050/api/project/`, {
          path: path[0]
        });
        console.log(resp.data);
        dispatch(getProject());
      } catch (err) {
        console.log(err.response);
      }
    });
    return () => ipcRenderer.removeAllListeners(['selected-project']);
  }, []);

  const { name, scenario, scenarios } = info;

  return (
    <div>
      <Card
        title={
          <React.Fragment>
            <h2>{error || name === '' ? 'No Project found' : name}</h2>
            <div className="cea-project-option-icons">
              <Icon type="plus" onClick={() => setModalVisible(true)} />
              <Icon
                type="folder-open"
                onClick={() => ipcRenderer.send('open-project')}
              />
              <Icon
                type="sync"
                onClick={() => {
                  dispatch(getProject());
                }}
                spin={isFetching}
              />
            </div>
          </React.Fragment>
        }
        bordered={false}
      >
        <Button type="primary" style={{ display: 'block', marginLeft: 'auto' }}>
          New Scenario
        </Button>
        {!scenarios.length ? (
          <div>No scenarios found</div>
        ) : scenario === '' ? (
          <div>No scenario currently selected</div>
        ) : (
          <ScenarioCard
            scenario={scenario}
            projectPath={info.path}
            current={true}
          />
        )}
        {scenarios.map(_scenario =>
          _scenario !== scenario ? (
            <ScenarioCard
              key={`${name}-${_scenario}`}
              scenario={_scenario}
              projectPath={info.path}
            />
          ) : null
        )}
      </Card>
      <ModalNewProject
        visible={isProjectModalVisible}
        setVisible={setProjectModalVisible}
        project={info}
        changeProject={() => dispatch(getProject())}
      />
    </div>
  );
};

const ModalNewProject = ({ visible, setVisible, project, changeProject }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();

  const handleOk = e => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        try {
          const createProject = await axios.post(
            `http://localhost:5050/api/project/`,
            values
          );
          console.log(createProject.data);
          setConfirmLoading(false);
          const updateProject = await axios.put(
            `http://localhost:5050/api/project/`,
            {
              path: path.join(values.path, values.name)
            }
          );
          console.log(updateProject.data);
          changeProject();
          setVisible(false);
        } catch (err) {
          console.log(err.response);
          setConfirmLoading(false);
        }
      }
    });
  };

  const handleCancel = e => {
    setVisible(false);
  };

  useEffect(() => {
    !visible && formRef.current && formRef.current.resetFields();
  }, [visible]);

  return (
    <Modal
      title="Create new Project"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
    >
      <NewProjectForm ref={formRef} project={project} />
    </Modal>
  );
};

const NewProjectForm = Form.create()(({ form, project }) => {
  useEffect(() => {
    ipcRenderer.on('selected-path', (event, id, path) => {
      form.setFieldsValue({ [id]: path[0] });
    });
    return () => ipcRenderer.removeAllListeners(['selected-path']);
  }, []);
  return (
    <Form layout="horizontal">
      {parameter(
        {
          type: 'InputParameter',
          name: 'name',
          value: '',
          help: 'Name of new Project'
        },
        form,
        {
          rules: [
            { required: true },
            {
              validator: (rule, value, callback) => {
                if (
                  value.length != 0 &&
                  fs.existsSync(path.join(form.getFieldValue('path'), value))
                ) {
                  callback('Folder with name already exists in path');
                } else {
                  callback();
                }
              }
            }
          ]
        }
      )}
      {parameter(
        {
          type: 'PathParameter',
          name: 'path',
          value: path.dirname(project.path),
          help: 'Path of new Project'
        },
        form
      )}
    </Form>
  );
});

const ScenarioCard = ({ scenario, projectPath, current = false }) => {
  const [image, isLoading, error] = useAsyncData(
    `http://localhost:5050/api/project/scenario/${scenario}/image`
  );
  const dispatch = useDispatch();

  const deleteScenario = async () => {
    try {
      const resp = await axios.delete(
        `http://localhost:5050/api/project/scenario/${scenario}`
      );
      console.log(resp.data);
      dispatch(getProject());
    } catch (err) {
      console.log(err.response);
    }
  };

  const changeScenario = async (goToEditor = false) => {
    try {
      const resp = await axios.put(`http://localhost:5050/api/project/`, {
        scenario
      });
      console.log(resp.data);
      await dispatch(getProject());
      goToEditor && dispatch(push(routes.INPUT_EDITOR));
    } catch (err) {
      console.log(err.response);
    }
  };

  const openFolder = () => {
    shell.openItem(path.join(projectPath, scenario));
  };

  return (
    <Card
      title={
        <React.Fragment>
          <span>{scenario} </span>
          {current ? <Tag>Current</Tag> : null}
        </React.Fragment>
      }
      style={{ marginTop: 16 }}
      type="inner"
      actions={[
        <Popconfirm
          title="Are you sure delete this scenario?"
          onConfirm={deleteScenario}
          okText="Yes"
          cancelText="No"
          key="delete"
        >
          <Icon type="delete" />
        </Popconfirm>,
        <Icon type="edit" key="edit" />,
        <Icon type="folder" key="folder" onClick={openFolder} />,
        <Icon type="select" key="select" onClick={() => changeScenario()} />
      ]}
    >
      <Row>
        <Col span={6}>
          <div
            style={{
              width: 256,
              height: 160,
              backgroundColor: '#eee',
              textAlign: 'center',
              textJustify: 'center'
            }}
          >
            {isLoading ? null : error ? (
              'Unable to generate image'
            ) : (
              <img
                className="cea-scenario-preview-image"
                src={`data:image/png;base64,${image.image}`}
                onClick={() => changeScenario(true)}
              />
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default Project;
