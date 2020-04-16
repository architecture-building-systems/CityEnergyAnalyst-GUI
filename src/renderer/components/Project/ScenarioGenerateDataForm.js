import React, { useState } from 'react';
import { Form, Checkbox, Row, Icon, Card, Input, Col } from 'antd';
import axios from 'axios';
import EditableMap from '../Map/EditableMap';
import ToolModal from './ToolModal';
import { calcPolyArea } from '../Map/EditableMap';

const MAX_AREA_SIZE = 100;

const ScenarioGenerateDataForm = ({ form, visible }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const tools = form.getFieldValue('tools') || [];
  const zoneChecked = tools.includes('zone');
  const surroundingsChecked = tools.includes('surroundings');

  const showModal = (tool) => {
    setSelectedTool(tool);
    setModalVisible(true);
  };

  const handleChange = (checkedValue) => {
    if (!checkedValue.includes('surroundings')) {
      setTimeout(() => {
        form.setFieldsValue({
          tools: checkedValue.filter(
            (element) => element === 'weather' || element === 'zone'
          ),
        });
      }, 0);
    }
  };

  return (
    <div
      style={{
        display: visible ? 'block' : 'none',
      }}
    >
      <Form.Item
        label="Data Mangement Tools"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {form.getFieldDecorator('tools', {
          initialValue: ['zone'],
        })(
          <Checkbox.Group onChange={handleChange}>
            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="zone" disabled>
                  Zone
                </Checkbox>
                <Icon type="setting" onClick={() => showModal('zone-helper')} />
                <small
                  style={{
                    marginLeft: 10,
                  }}
                >
                  *Selected by default
                </small>
              </Row>
              <small>- Query zone geometry from Open Street Maps.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="surroundings" disabled={!zoneChecked}>
                  Surroundings
                </Checkbox>
                <Icon
                  type="setting"
                  onClick={() => showModal('surroundings-helper')}
                />
                <small
                  style={{
                    color: 'red',
                    marginLeft: 10,
                    display: zoneChecked ? 'none' : '',
                  }}
                >
                  *Requires zone file.
                </small>
              </Row>
              <small>
                - Query Surroundings geometry from Open Street Maps.
              </small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="streets" disabled={!surroundingsChecked}>
                  Streets
                </Checkbox>
                <Icon
                  type="setting"
                  onClick={() => showModal('streets-helper')}
                />
                <small
                  style={{
                    color: 'red',
                    marginLeft: 10,
                    display: surroundingsChecked ? 'none' : '',
                  }}
                >
                  *Requires zone and surroundings file.
                </small>
              </Row>
              <small>- Query streets geometry from Open Street Maps.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="terrain" disabled={!surroundingsChecked}>
                  Terrain
                </Checkbox>
                <Icon
                  type="setting"
                  onClick={() => showModal('terrain-helper')}
                />
                <small
                  style={{
                    color: 'red',
                    marginLeft: 10,
                    display: surroundingsChecked ? 'none' : '',
                  }}
                >
                  *Requires zone and surroundings file.
                </small>
              </Row>
              <small>- Creates a fixed elevation terrain file.</small>
            </div>

            <div style={{ margin: 10 }}>
              <Row>
                <Checkbox value="weather">Weather</Checkbox>
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
            : 'none',
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

const checkLatLong = (rule, value, callback) => {
  const regex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  if (regex.test(`${value.lat},${value.long}`)) {
    callback();
  } else {
    callback('Please enter valid latitude/longitude coordinates');
  }
};

const checkArea = (rule, value, callback) => {
  if (rule.required && !value)
    callback('Create a polygon by selecting an area in the map.');
  if (calcPolyArea(value) > MAX_AREA_SIZE) {
    callback(
      `Area selected is above ${MAX_AREA_SIZE} km2. CEA would not be able to extract information from that size due to the bandwidth limitation of Open Street Maps API. Try selecting a smaller area.`
    );
  } else {
    callback();
  }
};

const ScenarioMap = ({ form }) => {
  const [location, setLocation] = useState();

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
              long: resp.data[0].lon,
            },
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
          zoom: 16,
        });
      }
    });
  };

  const setGeojson = (data) => {
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
            initialValue: '',
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
          rules: [{ validator: checkLatLong }],
        })(<LatLongInput onClick={goToLocation} />)}
      </Form.Item>

      <Form.Item>
        {form.getFieldDecorator('geojson', {
          initialValue: null,
          rules: [
            {
              required: form.getFieldValue('input-data') === 'generate',
              validator: checkArea,
            },
          ],
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
    const triggerChange = (changedValue) => {
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
            onChange={(e) => {
              triggerChange({ lat: e.target.value });
            }}
            onPressEnter={onClick}
          />
        </Col>
        <Col span={12}>
          <h4>Longitude</h4>
          <Input
            value={'long' in value ? value.long : null}
            onChange={(e) => {
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

export default ScenarioGenerateDataForm;
