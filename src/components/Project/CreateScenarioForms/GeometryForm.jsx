import {
  Form,
  Button,
  Select,
  Divider,
  InputNumber,
  Slider,
  Row,
  Col,
  Input,
} from 'antd';
import { useContext, useEffect, useState } from 'react';
import { OpenDialogButton } from '../../Tools/Parameter';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';

import { MapFormContext } from '../../../containers/CreateScenario';

const GENERATE_OSM_CEA = 'generate-osm-cea';
const EXAMPLE_CITIES = ['Singapore', 'Zürich'];

const UserGeometryForm = ({ initialValues, onBack, onFinish }) => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item
        label="Building geometries (zone)"
        name="user_zone"
        extra={
          <div>
            <div>Link to a path to building geometries in .shp format.</div>
            <div>See an example here.</div>
          </div>
        }
        rules={[{ required: true, message: 'This field is required' }]}
      >
        <Select
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="user_zone"
                type="file"
                filters={[{ name: 'SHP files', extensions: ['shp'] }]}
                placeholder="or enter path to zone file"
              >
                <PlusOutlined />
                Browse for zone file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Built-in',
              options: [
                {
                  label: 'Generate from OSM using CEA',
                  value: GENERATE_OSM_CEA,
                },
              ],
            },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="Other building geometries (surroundings)"
        name="user_surroundings"
        extra={
          <div>
            <div>
              Link to a path to surrounding building geometries in .shp format.
            </div>
            <div>See an example here.</div>
          </div>
        }
        rules={[{ required: true, message: 'This field is required' }]}
      >
        <Select
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="user_surroundings"
                type="file"
                filters={[{ name: 'SHP files', extensions: ['shp'] }]}
                placeholder="or enter path to surroundings file"
              >
                <PlusOutlined />
                Browse for surroundings file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: (
                <div>
                  None{' '}
                  <i style={{ color: 'rgba(0, 0, 0, 0.5)' }}>
                    (No surrounding buildings)
                  </i>
                </div>
              ),
              value: 'none',
            },
            {
              label: 'CEA Built-in',
              options: [
                {
                  label: 'Generate from OSM using CEA',
                  value: GENERATE_OSM_CEA,
                },
              ],
            },
          ]}
        />
      </Form.Item>

      <Form.Item>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            style={{ padding: '0 36px' }}
          >
            Next
          </Button>
          <Button style={{ padding: '0 36px' }} onClick={onBack}>
            Back
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

const GenerateGeometryForm = ({ initialValues, onBack, onFinish }) => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onFinish={onFinish}
      layout="vertical"
    >
      {initialValues?.user_zone === GENERATE_OSM_CEA && (
        <>
          <GenerateZoneGeometryForm form={form} name="generate_zone" />

          <Form.Item
            label="Generate zone geometry"
            name="generate_zone"
            rules={[{ required: true }]}
            hidden
          />
        </>
      )}

      {initialValues?.user_surroundings === GENERATE_OSM_CEA && (
        <Form.Item
          label="Generate surroundings geometry"
          name="generate_surroundings"
          extra="Buffer in meters around the zone geometry"
          rules={[{ required: true }]}
        >
          <IntegerSliderInput />
        </Form.Item>
      )}
      <Form.Item>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button
            type="primary"
            htmlType="submit"
            style={{ padding: '0 36px' }}
          >
            Next
          </Button>
          <Button style={{ padding: '0 36px' }} onClick={onBack}>
            Back
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

const GenerateZoneGeometryForm = ({ form, name }) => {
  const { geojson, setLocation } = useContext(MapFormContext);
  const [loading, setLoading] = useState(false);
  const [locationAddress, setAddress] = useState(null);

  const randomCity =
    EXAMPLE_CITIES[Math.floor(Math.random() * EXAMPLE_CITIES.length)];

  const onSearch = async (searchAddress) => {
    if (searchAddress.trim().length === 0) return;

    setLoading(true);
    setAddress(null);
    try {
      const data = await getGeocodeLocation(searchAddress);
      if (data === null) {
        throw new Error('Location not found');
      }

      const { lat, lon, display_name } = data;
      setLocation({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        zoom: 16,
      });
      setAddress(display_name);
    } catch (err) {
      console.error(err);
      setAddress(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set null if no features
    let value = null;
    if (geojson?.features?.length) value = geojson;

    form.setFieldsValue({ [name]: value });
  }, [geojson]);

  return (
    <Form.Item label="Generate zone geometry" extra="Search for a location">
      <Input.Search
        placeholder={`Example: type "${randomCity}”`}
        allowClear
        enterButton="Search"
        loading={loading}
        onSearch={onSearch}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Prevent form submit
            e.preventDefault();
          }
        }}
      />
      {locationAddress instanceof Error ? (
        <small style={{ margin: 4 }}>
          <i>Location not found</i>
        </small>
      ) : (
        locationAddress && (
          <small style={{ margin: 4 }}>
            <i>Found location: {locationAddress}</i>
          </small>
        )
      )}
    </Form.Item>
  );
};

const getGeocodeLocation = async (address) => {
  try {
    const _address = encodeURIComponent(address);
    const resp = await axios.get(
      `https://nominatim.openstreetmap.org/?format=json&q=${_address}&limit=1`,
    );
    if (resp?.data && resp.data.length) {
      return resp.data[0];
    } else return null;
  } catch (err) {
    console.error(err);
    return null;
  }
};

const IntegerSliderInput = ({
  name,
  defaultValue = 50,
  min = 1,
  max = 500,
  ...rest
}) => {
  // For antd form controls
  const { id, value, onChange } = rest;
  const [inputValue, setInputValue] = useState(value);

  const onInputChange = (newValue) => {
    setInputValue(newValue);

    if (onChange) onChange(newValue);
  };

  useEffect(() => {
    // Make sure default value is set on mount
    onInputChange(value !== undefined ? value : defaultValue);
  }, []);

  return (
    <Row>
      <Col span={12}>
        <Slider
          min={min}
          max={max}
          onChange={onInputChange}
          value={typeof inputValue === 'number' ? inputValue : 0}
        />
      </Col>
      <Col span={4}>
        <InputNumber
          id={id}
          name={name}
          min={min}
          max={max}
          style={{
            margin: '0 16px',
          }}
          value={inputValue}
          onChange={onInputChange}
        />
      </Col>
    </Row>
  );
};

const GeometryForm = ({ initialValues, onBack, onFinish }) => {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState(initialValues);

  const onUserGeomertyFormFinish = (values) => {
    // Complete geometry form if user geometry is provided
    if (
      values?.user_zone !== GENERATE_OSM_CEA &&
      values?.user_surroundings !== GENERATE_OSM_CEA
    ) {
      onFinish(values);
    } else {
      // Otherwise, bring to next geometry form
      setFormData({ ...formData, ...values });
      setCurrent(current + 1);
    }
  };

  const onGenerateGeometryFormFinish = (values) => {
    const allFormData = { ...formData, ...values };
    setFormData(allFormData);
    onFinish(allFormData);
  };

  const onGeometryFormBack = () => {
    setCurrent(current - 1);
  };

  const forms = [
    <UserGeometryForm
      initialValues={formData}
      onBack={onBack}
      onFinish={onUserGeomertyFormFinish}
    />,
    <GenerateGeometryForm
      initialValues={formData}
      onBack={onGeometryFormBack}
      onFinish={onGenerateGeometryFormFinish}
    />,
  ];

  return forms[current];
};

export default GeometryForm;
