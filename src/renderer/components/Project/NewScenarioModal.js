import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ipcRenderer } from 'electron';
import {
  Modal,
  Form,
  Radio,
  Input,
  Checkbox,
  Row,
  Col,
  Select,
  Icon,
  Card,
  Button,
  Dropdown,
  Menu
} from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getProject } from '../../actions/project';
import EditableMap from '../Map/EditableMap';
import ToolModal from './ToolModal';
import CreatingScenarioModal from './CreatingScenarioModal';

const NewScenarioModal = ({ visible, setVisible, project }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const formRef = useRef();
  const dispatch = useDispatch();

  const reloadProject = () => {
    dispatch(getProject());
  };

  const handleOk = e => {
    formRef.current.validateFieldsAndScroll(
      { scroll: { offsetTop: 60 } },
      async (err, values) => {
        if (!err) {
          setConfirmLoading(true);
          setModalVisible(true);
          console.log('Received values of form: ', values);
          try {
            const resp = await axios.post(
              'http://localhost:5050/api/project/scenario/',
              values
            );
            console.log(resp.data);
            setModalVisible(false);
            setConfirmLoading(false);
            handleCancel();
            reloadProject();
          } catch (err) {
            console.log(err.response);
            setModalVisible(false);
            setConfirmLoading(false);
          }
        }
      }
    );
  };

  const handleCancel = e => {
    setVisible(false);
    formRef.current.resetFields();
  };

  return (
    <Modal
      title="Create new Scenario"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      okText="Create"
    >
      <NewScenarioForm ref={formRef} project={project} />
      <CreatingScenarioModal
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </Modal>
  );
};

const NewScenarioForm = Form.create()(({ form, project }) => {
  // FIXME: ipc listener clash
  useEffect(() => {
    ipcRenderer.on('selected-path', (event, id, path) => {
      form.setFieldsValue({ [id]: path[0] }, () => form.validateFields([id]));
    });
    return () => ipcRenderer.removeAllListeners(['selected-path']);
  }, []);

  return (
    <Form>
      <Form.Item label={<h2 style={{ display: 'inline' }}>Scenario Name</h2>}>
        {form.getFieldDecorator('name', {
          initialValue: '',
          rules: [
            { required: true },
            {
              validator: (rule, value, callback) => {
                if (
                  value.length != 0 &&
                  fs.existsSync(path.join(project.path, value))
                ) {
                  callback('Scenario with name already exists in project');
                } else {
                  callback();
                }
              }
            }
          ]
        })(<Input placeholder="Name of new Scenario" />)}
      </Form.Item>

      <h2>Input Data</h2>
      <Form.Item>
        {form.getFieldDecorator('input-data', {
          initialValue: 'generate'
        })(
          <Radio.Group>
            <Radio value="generate" style={{ display: 'block' }}>
              Generate new input files using tools
            </Radio>
            {project.scenarios.length ? (
              <Radio value="copy" style={{ display: 'block' }}>
                Copy input folder from another scenario in the project
              </Radio>
            ) : null}
            <Radio value="import" style={{ display: 'block' }}>
              Import input files
            </Radio>
          </Radio.Group>
        )}
      </Form.Item>

      <ScenarioGenerateDataForm
        form={form}
        visible={form.getFieldValue('input-data') === 'generate'}
      />
      <ScenarioCopyDataForm
        form={form}
        visible={form.getFieldValue('input-data') === 'copy'}
        project={project}
      />
      <ScenarioImportDataForm
        form={form}
        visible={form.getFieldValue('input-data') === 'import'}
      />
    </Form>
  );
});

const ScenarioGenerateDataForm = ({ form, visible }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const tools = form.getFieldValue('tools') || [];
  const zoneChecked = tools.includes('zone');
  const districtChecked = tools.includes('district');

  const showModal = tool => {
    setSelectedTool(tool);
    setModalVisible(true);
  };

  const handleChange = checkedValue => {
    if (!checkedValue.includes('zone')) {
      setTimeout(() => {
        form.setFieldsValue({
          tools: checkedValue.filter(element => element === 'weather')
        });
      }, 0);
    }
    if (!checkedValue.includes('district')) {
      setTimeout(() => {
        form.setFieldsValue({
          tools: checkedValue.filter(
            element => element === 'weather' || element === 'zone'
          )
        });
      }, 0);
    }
  };

  return (
    <div
      style={{
        display: visible ? 'block' : 'none'
      }}
    >
      <Form.Item
        label="Data Mangement Tools"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {form.getFieldDecorator('tools', {
          initialValue: []
        })(
          <Checkbox.Group onChange={handleChange}>
            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="zone">Zone</Checkbox>
                <Icon type="info-circle" />
                <Icon type="setting" onClick={() => showModal('zone-helper')} />
              </Row>
              <small>- Query zone geometry from Open Street Maps.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="district" disabled={!zoneChecked}>
                  District
                </Checkbox>
                <Icon type="info-circle" />
                <Icon
                  type="setting"
                  onClick={() => showModal('district-helper')}
                />
                <small
                  style={{
                    color: 'red',
                    display: zoneChecked ? 'none' : ''
                  }}
                >
                  *Requires zone file.
                </small>
              </Row>
              <small>- Query district geometry from Open Street Maps.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="streets" disabled={!districtChecked}>
                  Streets
                </Checkbox>
                <Icon type="info-circle" />
                <Icon
                  type="setting"
                  onClick={() => showModal('streets-helper')}
                />
                <small
                  style={{
                    color: 'red',
                    display: districtChecked ? 'none' : ''
                  }}
                >
                  *Requires zone and district file.
                </small>
              </Row>
              <small>- Query streets geometry from Open Street Maps.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="terrain" disabled={!districtChecked}>
                  Terrain
                </Checkbox>
                <Icon type="info-circle" />
                <Icon
                  type="setting"
                  onClick={() => showModal('terrain-helper')}
                />
                <small
                  style={{
                    color: 'red',
                    display: districtChecked ? 'none' : ''
                  }}
                >
                  *Requires zone and district file.
                </small>
              </Row>
              <small>- Creates a fixed elevation terrain file.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="weather">Weather</Checkbox>
                <Icon type="info-circle" />
                <Icon
                  type="setting"
                  onClick={() => showModal('weather-helper')}
                />
              </Row>
              <small>- Set the weather file for the scenario.</small>
            </div>
          </Checkbox.Group>
        )}
      </Form.Item>
      <div
        style={{
          display: form.getFieldValue('tools').includes('zone')
            ? 'block'
            : 'none'
        }}
      >
        <ScenarioMap form={form} />
      </div>
      <ToolModal
        tool={selectedTool}
        visible={modalVisible}
        setVisible={setModalVisible}
      />
    </div>
  );
};

const ScenarioMap = ({ form }) => {
  const [location, setLocation] = useState();
  const checkLatLong = (rule, value, callback) => {
    const regex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    if (regex.test(`${value.lat},${value.long}`)) {
      callback();
    } else {
      callback('Please enter valid latitude/longitude coordinates');
    }
  };
  const getLatLong = async () => {
    const address = form.getFieldValue('location');
    try {
      const resp = await axios.get(
        `https://nominatim.openstreetmap.org/?format=json&q=${address}&limit=1`
      );
      if (resp.data) {
        form.setFieldsValue(
          {
            latlong: {
              lat: resp.data[0].lat,
              long: resp.data[0].lon
            }
          },
          goToLocation
        );
      }
    } catch (err) {
      console.log(err);
    }
  };

  const goToLocation = () => {
    form.validateFields(['latlong'], (err, values) => {
      if (!err) {
        setLocation({
          latitude: parseFloat(values.latlong.lat),
          longitude: parseFloat(values.latlong.long),
          zoom: 16
        });
      }
    });
  };

  const setGeojson = data => {
    form.setFieldsValue({ geojson: data });
  };

  return (
    <Card>
      <h2>Select an area in the map for the zone file</h2>
      <small> Navigate to an area using a location or coordinates. </small>

      <Form.Item>
        <Row>
          <h4>Location</h4>
          {form.getFieldDecorator('location', {
            initialValue: ''
          })(
            <Input
              onPressEnter={getLatLong}
              addonAfter={
                <button
                  type="button"
                  style={{ height: 30, width: 50 }}
                  onClick={getLatLong}
                >
                  Go
                </button>
              }
            />
          )}
        </Row>
      </Form.Item>

      <Form.Item>
        {form.getFieldDecorator('latlong', {
          initialValue: { lat: 0, long: 0 },
          rules: [{ validator: checkLatLong }]
        })(<LatLongInput onClick={goToLocation} />)}
      </Form.Item>

      <Form.Item>
        {form.getFieldDecorator('geojson', {
          initialValue: null,
          rules: [
            {
              required: form.getFieldValue('tools').includes('zone'),
              message: 'Create a polygon'
            }
          ]
        })(<Input style={{ display: 'none' }} />)}
      </Form.Item>

      {form.getFieldValue('tools').includes('zone') && (
        <div style={{ position: 'relative', height: 450 }}>
          <EditableMap
            location={location}
            geojson={form.getFieldValue('geojson')}
            outputGeojson={setGeojson}
          />
        </div>
      )}
    </Card>
  );
};

const LatLongInput = React.forwardRef(
  ({ value = {}, onChange, onClick = null }, ref) => {
    const triggerChange = changedValue => {
      if (onChange) {
        onChange({ ...value, ...changedValue });
      }
    };

    return (
      <Row gutter={16} ref={ref}>
        <Col span={12}>
          <h4>Latitude</h4>
          <Input
            value={'lat' in value ? value.lat : null}
            onChange={e => {
              triggerChange({ lat: e.target.value });
            }}
            onPressEnter={onClick}
          />
        </Col>
        <Col span={12}>
          <h4>Longitude</h4>
          <Input
            value={'long' in value ? value.long : null}
            onChange={e => {
              triggerChange({ long: e.target.value });
            }}
            onPressEnter={onClick}
            addonAfter={
              <button
                type="button"
                style={{ height: 30, width: 50 }}
                onClick={onClick}
              >
                Go
              </button>
            }
          />
        </Col>
      </Row>
    );
  }
);

const ScenarioCopyDataForm = ({ form, visible, project }) => {
  const { Option } = Select;
  return (
    <div
      style={{
        display: visible ? 'block' : 'none'
      }}
    >
      <Form.Item
        label="Scenarios in Project"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {form.getFieldDecorator('copy-scenario', {
          initialValue: project.scenarios[0]
        })(
          <Select>
            {project.scenarios.map((scenario, index) => (
              <Option key={index} value={scenario}>
                {scenario}
              </Option>
            ))}
          </Select>
        )}
      </Form.Item>
    </div>
  );
};

const ScenarioImportDataForm = ({ form, visible }) => {
  const inputFiles = {
    zone: {
      extension: ['.shp'],
      placeholder: 'Path to geometry of the zone',
      help: ''
    },
    district: {
      extension: ['.shp'],
      placeholder: 'Path to geometry of surroundings',
      help: ''
    },
    streets: {
      extension: ['.shp'],
      placeholder: 'Path to street geometry',
      help: ''
    },
    terrain: {
      extension: ['.tif'],
      placeholder: 'Path to the digital elevation model',
      help: ''
    },
    occupancy: {
      extension: ['.dbf'],
      placeholder: 'Path to occupancy database',
      help: 'Leave empty for CEA to create one for you'
    },
    age: {
      extension: ['.dbf'],
      placeholder: 'Path to age database',
      help: 'Leave empty for CEA to create one for you'
    }
  };
  form.getFieldDecorator('fields', {
    initialValue: ['zone', 'age', 'occupancy']
  });
  const fields = form.getFieldValue('fields');
  const fileChoices = Object.keys(inputFiles).filter(
    fileType => !fields.includes(fileType)
  );

  const addField = value => {
    const newFields = fields.concat(value);
    form.setFieldsValue({
      fields: newFields
    });
  };

  const removeField = k => {
    form.setFieldsValue({
      fields: fields.filter(key => key !== k)
    });
  };

  const openDialog = (id, file) => {
    ipcRenderer.send('open-path-dialog', id, {
      properties: ['openFile'],
      filters: [
        {
          name: `${file} file`,
          extensions: inputFiles[file].extension.map(fileExtension =>
            fileExtension.substr(1)
          )
        }
      ]
    });
  };

  // Check if file is valid
  const vaildFile = (fileType, filePath) => {
    return true;
  };

  return (
    <div
      style={{
        display: visible ? 'block' : 'none'
      }}
    >
      <Dropdown
        overlay={
          <Menu>
            {fileChoices.map(choice => (
              <Menu.Item key={choice} onClick={() => addField(choice)}>
                {choice}
              </Menu.Item>
            ))}
          </Menu>
        }
        trigger={['click']}
      >
        <Button>
          Select additional files that you want to import <Icon type="down" />
        </Button>
      </Dropdown>

      {fields.map((key, index) => (
        <Form.Item key={key} label={key}>
          {form.getFieldDecorator(`files[${key}]`, {
            initialValue: '',
            rules: [
              { required: visible && key === 'zone' },
              visible
                ? {
                    validator: (rule, value, callback) => {
                      if (!fs.existsSync(value)) {
                        if (
                          ['zone', 'age', 'occupancy'].includes(key) &&
                          value === ''
                        ) {
                          callback();
                        } else callback('Path does not exist');
                      } else if (!vaildFile(key, value))
                        callback(`Select a vaild ${key} file`);
                      else callback();
                    }
                  }
                : {}
            ]
          })(
            <Input
              style={{ width: '60%', marginRight: 8 }}
              placeholder={inputFiles[key].placeholder}
              addonAfter={
                <button
                  type="button"
                  style={{ height: '30px', width: '50px' }}
                  onClick={() => openDialog(`files[${key}]`, key)}
                >
                  <Icon type="ellipsis" />
                </button>
              }
            />
          )}
          {['zone', 'age', 'occupancy'].includes(key) ? null : (
            <Icon
              type="minus-circle-o"
              onClick={() => removeField(key)}
              style={{
                position: 'relative',
                top: 4,
                color: '#ff4d4f',
                fontSize: 24
              }}
            />
          )}
          <small style={{ display: 'block', lineHeight: 'normal' }}>
            {inputFiles[key].help}
          </small>
        </Form.Item>
      ))}
    </div>
  );
};

export default NewScenarioModal;
