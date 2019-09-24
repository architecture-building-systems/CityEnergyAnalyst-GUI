import React, { useState, useRef, useEffect } from 'react';
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
  Card
} from 'antd';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import parameter from '../Tools/parameter';
import EditableMap from '../Map/EditableMap';

const NewScenarioModal = ({ visible, setVisible, project, reloadProject }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const formRef = useRef();

  const handleOk = e => {
    formRef.current.validateFields(async (err, values) => {
      if (!err) {
        // setConfirmLoading(true);
        console.log('Received values of form: ', values);
        // try {
        //   setConfirmLoading(false);
        //   reloadProject();
        //   formRef.current.resetFields();
        //   setVisible(false);
        // } catch (err) {
        //   console.log(err.response);
        //   setConfirmLoading(false);
        // }
      }
    });
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
    </Modal>
  );
};

const NewScenarioForm = Form.create()(({ form, project }) => {
  useEffect(() => {
    ipcRenderer.on('selected-path', (event, id, path) => {
      form.setFieldsValue({ [id]: path[0] });
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
            <Radio value="copy" style={{ display: 'block' }}>
              Copy input folder from another scenario in the project
            </Radio>
            {project.scenarios.length && (
              <Radio value="import" style={{ display: 'block' }}>
                Import input files
              </Radio>
            )}
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
  const tools = form.getFieldValue('tools') || [];
  const zoneChecked = tools.includes('zone');
  const districtChecked = tools.includes('district');

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
                <Icon type="setting" />
              </Row>
              <small>- Query zone geometry from Open Street Maps.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="district" disabled={!zoneChecked}>
                  District
                </Checkbox>
                <Icon type="info-circle" />
                <Icon type="setting" />
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
                <Icon type="setting" />
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
                <Icon type="setting" />
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
                <Icon type="setting" />
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
        form.setFieldsValue({
          latlong: {
            lat: resp.data[0].lat,
            long: resp.data[0].lon
          }
        });
        goToLocation();
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
      <Form.Item>
        {form.getFieldDecorator('geojson', {
          initialValue: '',
          rules: [
            {
              required: form.getFieldValue('tools').includes('zone'),
              message: 'Create a polygon'
            }
          ]
        })(<Input style={{ display: 'none' }} />)}
      </Form.Item>
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

      <div style={{ position: 'relative', height: 450 }}>
        <EditableMap location={location} outputGeojson={setGeojson} />
      </div>
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
  return (
    <div
      style={{
        display: visible ? 'block' : 'none'
      }}
    >
      Import
    </div>
  );
};

export default NewScenarioModal;
