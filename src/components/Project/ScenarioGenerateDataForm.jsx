import { Suspense, forwardRef, lazy, useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import { Checkbox, Row, Card, Input, Col } from 'antd';
import axios from 'axios';
import ToolModal from './ToolModal';
import { calcPolyArea } from '../Map/utils';

const EditableMap = lazy(() => import('../Map/EditableMap'));

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
            (element) => element === 'weather' || element === 'zone',
          ),
        });
      }, 0);
    }
  };

  const ZoneTool = () => (
    <div>
      <div>
        <Checkbox value="zone" disabled>
          Zone
        </Checkbox>
        <SettingOutlined onClick={() => showModal('zone-helper')} />
        <small
          style={{
            marginLeft: 10,
          }}
        >
          *Selected by default
        </small>
      </div>
      <small>- Query zone geometry from Open Street Maps.</small>
    </div>
  );

  const SurroundingsTool = () => (
    <div>
      <div>
        <Checkbox value="surroundings" disabled={!zoneChecked}>
          Surroundings
        </Checkbox>
        <SettingOutlined onClick={() => showModal('surroundings-helper')} />
        <small
          style={{
            color: 'red',
            marginLeft: 10,
            display: zoneChecked ? 'none' : '',
          }}
        >
          *Requires zone file.
        </small>
      </div>
      <small>- Query Surroundings geometry from Open Street Maps.</small>
    </div>
  );

  const StreetsTool = () => (
    <div>
      <div>
        <Checkbox value="streets" disabled={!surroundingsChecked}>
          Streets
        </Checkbox>
        <SettingOutlined onClick={() => showModal('streets-helper')} />
        <small
          style={{
            color: 'red',
            marginLeft: 10,
            display: surroundingsChecked ? 'none' : '',
          }}
        >
          *Requires zone and surroundings file.
        </small>
      </div>
      <small>- Query streets geometry from Open Street Maps.</small>
    </div>
  );

  const TerrainTool = () => (
    <div>
      <div>
        <Checkbox value="terrain" disabled={!surroundingsChecked}>
          Terrain
        </Checkbox>
        <SettingOutlined onClick={() => showModal('terrain-helper')} />
        <small
          style={{
            color: 'red',
            marginLeft: 10,
            display: surroundingsChecked ? 'none' : '',
          }}
        >
          *Requires zone and surroundings file.
        </small>
      </div>
      <small>- Creates a fixed elevation terrain file.</small>
    </div>
  );

  const WeatherTool = () => (
    <div>
      <div>
        <Checkbox value="weather">Weather</Checkbox>
        <SettingOutlined onClick={() => showModal('weather-helper')} />
      </div>
      <small>- Set the weather file for the scenario.</small>
    </div>
  );

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ZoneTool />
              <SurroundingsTool />
              <StreetsTool />
              <TerrainTool />
              <WeatherTool />
            </div>
          </Checkbox.Group>,
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
  const regex =
    /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  if (regex.test(`${value.lat},${value.long}`)) {
    callback();
  } else {
    callback('Please enter valid latitude/longitude coordinates');
  }
};

const checkArea = (rule, value, callback) => {
  if (!rule.required) callback();
  else if (!value)
    callback('Create a polygon by selecting an area in the map.');
  else if (calcPolyArea(value) > MAX_AREA_SIZE) {
    callback(
      `Area selected is above ${MAX_AREA_SIZE} km2. CEA would not be able to extract information from that size due to the bandwidth limitation of Open Street Maps API. Try selecting a smaller area.`,
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
        `https://nominatim.openstreetmap.org/?format=json&q=${address}&limit=1`,
      );
      if (resp.data) {
        form.setFieldsValue(
          {
            latlong: {
              lat: resp.data[0].lat,
              long: resp.data[0].lon,
            },
          },
          goToLocation,
        );
      }
    } catch (err) {
      console.error(err);
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
          <div>Location</div>
          {form.getFieldDecorator('location', {
            initialValue: '',
          })(
            <Input.Search
              placeholder="input location name"
              allowClear
              enterButton="Search"
              onSearch={getLatLong}
            />,
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
              required: form.getFieldValue('input_data') === 'generate',
              validator: checkArea,
            },
          ],
        })(<Input style={{ display: 'none' }} />)}
      </Form.Item>

      {form.getFieldValue('tools').includes('zone') && (
        <div style={{ position: 'relative', height: 450 }}>
          <Suspense>
            <EditableMap
              location={location}
              geojson={form.getFieldValue('geojson')}
              setValue={setGeojson}
            />
          </Suspense>
        </div>
      )}
    </Card>
  );
};

const LatLongInput = forwardRef(
  ({ value = {}, onChange, onClick = null }, ref) => {
    const triggerChange = (changedValue) => {
      if (onChange) {
        onChange({ ...value, ...changedValue });
      }
    };

    return (
      <Row gutter={16} ref={ref}>
        <Col span={12}>
          <div>Latitude</div>
          <Input
            value={'lat' in value ? value.lat : null}
            onChange={(e) => {
              triggerChange({ lat: e.target.value });
            }}
            onPressEnter={onClick}
          />
        </Col>
        <Col span={12}>
          <div>Longitude</div>
          <Input.Search
            value={'long' in value ? value.long : null}
            style={{ marginTop: 4 }}
            enterButton="Go"
            onSearch={onClick}
            onChange={(e) => {
              triggerChange({ long: e.target.value });
            }}
          />
        </Col>
      </Row>
    );
  },
);
LatLongInput.displayName = 'LatLongInput';

export default ScenarioGenerateDataForm;
