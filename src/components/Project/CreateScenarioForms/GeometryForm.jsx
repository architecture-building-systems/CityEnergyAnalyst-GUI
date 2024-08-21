import { Form, Button, Select, Divider, InputNumber, Input } from 'antd';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { OpenDialogButton } from '../../Tools/Parameter';
import { FileSearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { MapFormContext } from './hooks';
import {
  GENERATE_ZONE_CEA,
  GENERATE_SURROUNDINGS_CEA,
  EMTPY_GEOMETRY,
  EXAMPLE_CITIES,
  GENERATE_TYPOLOGY_CEA,
} from './constants';

const validateGeometry = async (value, buildingType) => {
  if (
    [GENERATE_ZONE_CEA, GENERATE_SURROUNDINGS_CEA, EMTPY_GEOMETRY].includes(
      value,
    )
  )
    return Promise.resolve();

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_CEA_URL}/api/geometry/buildings/validate`,
      {
        type: 'path',
        building: buildingType,
        path: value,
      },
    );
    console.log(response);
    return Promise.resolve();
  } catch (error) {
    const errorMessage =
      error?.response?.data?.detail || 'Unable to validate geometries.';
    return Promise.reject(`${errorMessage}`);
  }
};

const validateTypology = async (value) => {
  if (value === GENERATE_TYPOLOGY_CEA) return Promise.resolve();

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_CEA_URL}/api/geometry/typology/validate`,
      {
        type: 'path',
        path: value,
      },
    );
    console.log(response);
    return Promise.resolve();
  } catch (error) {
    const errorMessage =
      error?.response?.data?.detail || 'Unable to validate typology.';
    return Promise.reject(`${errorMessage}`);
  }
};

const UserGeometryForm = ({
  initialValues,
  onChange,
  onBack,
  onFinish,
  setSecondary,
}) => {
  const [form] = Form.useForm();
  const [zoneValue, setZoneValue] = useState(initialValues.user_zone);
  const [typologyInZone, setTypologyInZone] = useState(
    // Set to true if initial value is not defined
    initialValues?.typology_in_zone == undefined
      ? true
      : initialValues?.typology_in_zone,
  );

  const showTypologyForm = useMemo(
    // Show typology form if zone is not empty and there are no typology values in zone
    () =>
      ![GENERATE_ZONE_CEA, undefined].includes(zoneValue) && !typologyInZone,
    [zoneValue, typologyInZone],
  );

  const checkZoneForTypology = async (value) => {
    // Do not check if zone is empty or generated
    if ([GENERATE_ZONE_CEA, EMTPY_GEOMETRY].includes(value)) {
      onTypologyInZoneChange(true);
      return Promise.resolve();
    }

    // Set "typology in zone" state
    try {
      await validateTypology(value);
      onTypologyInZoneChange(true);
    } catch (error) {
      onTypologyInZoneChange(false);
    }

    // Always resolve validation
    return Promise.resolve();
  };

  useEffect(() => {
    setSecondary();
  }, []);

  const onZoneChange = (value) => {
    setZoneValue(value);

    // Trigger parent form change
    onChange?.({ user_zone: value });
  };

  const onTypologyInZoneChange = (value) => {
    setTypologyInZone(value);

    // Store "typology in zone" state in parent form
    // Clear typology if typology in zone is true
    if (value) onChange?.({ typology_in_zone: value, typology: null });
    // Trigger parent form change
    else onChange?.({ typology_in_zone: value });
  };

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
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
        rules={[
          { required: true, message: 'This field is required.' },
          {
            validator: async (_, value) =>
              await validateGeometry(value, 'zone'),
          },
          {
            validator: async (_, value) => await checkZoneForTypology(value),
          },
        ]}
      >
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="user_zone"
                type="file"
                filters={[{ name: 'SHP files', extensions: ['shp'] }]}
                placeholder="Or enter path to zone file here"
                onChange={onZoneChange}
              >
                <FileSearchOutlined />
                Browse for zone file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Tools',
              options: [
                {
                  label: 'Generate from OpenStreetMap using CEA',
                  value: GENERATE_ZONE_CEA,
                },
              ],
            },
          ]}
          onChange={onZoneChange}
        />
      </Form.Item>

      {showTypologyForm && (
        <Form.Item
          label="Building information (typology)"
          name="typology"
          // Do not preserve typology value when typology form item is hidden
          preserve={false}
          extra={
            <div>
              <br />
              <div>
                Link to a path to building information in .xlsx/.csv/.dbf
                format.
              </div>
              <div>See an example here.</div>
              <br />
              <div>You can leave it empty and modify it later.</div>
            </div>
          }
          rules={[
            { required: true, message: 'This field is required.' },
            { validator: (_, value) => validateTypology(value) },
          ]}
        >
          <Select
            placeholder="Choose an option from the dropdown"
            dropdownRender={(menu) => (
              <div>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <OpenDialogButton
                  form={form}
                  name="typology"
                  type="file"
                  filters={[{ name: 'DBF files', extensions: ['dbf'] }]}
                  placeholder="Or enter path to typology file here"
                >
                  <FileSearchOutlined />
                  Browse for typology file
                </OpenDialogButton>
              </div>
            )}
            options={[
              {
                label: 'Defaults',
                options: [
                  {
                    label: 'Auto-generate using default values',
                    value: GENERATE_TYPOLOGY_CEA,
                  },
                ],
              },
            ]}
          />
        </Form.Item>
      )}

      <Form.Item
        label="Building geometries (surroundings)"
        name="user_surroundings"
        extra={
          <div>
            <div>
              Link to a path to surrounding building geometries in .shp format.
            </div>
            <div>See an example here.</div>
          </div>
        }
        rules={[
          { required: true, message: 'This field is required.' },
          { validator: (_, value) => validateGeometry(value, 'surroundings') },
        ]}
      >
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="user_surroundings"
                type="file"
                filters={[{ name: 'SHP files', extensions: ['shp'] }]}
                placeholder="Or enter path to surroundings file here"
              >
                <FileSearchOutlined />
                Browse for surroundings file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Tools',
              options: [
                {
                  label: 'Generate from OpenStreetMap using CEA',
                  value: GENERATE_SURROUNDINGS_CEA,
                },
              ],
            },
            {
              label: 'None',
              options: [
                {
                  label: 'No surrounding buildings',
                  value: EMTPY_GEOMETRY,
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

const GenerateGeometryForm = ({
  initialValues,
  onChange,
  onBack,
  onFinish,
  setSecondary,
}) => {
  const [form] = Form.useForm();
  const [error, setError] = useState(null);

  const onFinishFailed = ({ errorFields }) => {
    setError(errorFields.find((error) => error.name.includes('generate_zone')));
  };

  useEffect(() => {
    if (initialValues?.user_zone === GENERATE_ZONE_CEA) setSecondary('map');
  }, []);

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      layout="vertical"
    >
      {initialValues?.user_zone === GENERATE_ZONE_CEA && (
        <>
          <div
            style={{
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div>
              Search for a location below and select an area with buildings by
              drawing a polygon on the map.
            </div>
            {error && <div style={{ color: 'red' }}>{error.errors[0]}</div>}
          </div>

          <GenerateZoneGeometryForm
            form={form}
            name="generate_zone"
            onChange={() => setError(null)}
          />

          <Form.Item
            name="generate_zone"
            rules={[
              {
                validator: (_, value) =>
                  value?.features?.length
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          'Area geometry not found. Please select an area on the map by drawing a polygon.',
                        ),
                      ),
              },
            ]}
            hidden
          />
        </>
      )}

      {initialValues?.user_surroundings === GENERATE_SURROUNDINGS_CEA && (
        <Form.Item
          label="Generate surroundings geometry"
          name="generate_surroundings"
          extra="Set the buffer in meters around the zone buildings."
          rules={[{ required: true, message: 'This field is required.' }]}
          initialValue={initialValues.generate_surroundings || 50}
        >
          <InputNumber min={1} />
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

const GenerateZoneGeometryForm = ({ form, name, onChange }) => {
  const randomCity = useRef(
    EXAMPLE_CITIES[Math.floor(Math.random() * EXAMPLE_CITIES.length)],
  );

  const { geojson, setLocation } = useContext(MapFormContext);
  const [loading, setLoading] = useState(false);
  const [locationAddress, setAddress] = useState(null);

  const onSearch = async (searchAddress) => {
    if (searchAddress.trim().length === 0) return;

    setLoading(true);
    setAddress(null);
    try {
      const data = await getGeocodeLocation(searchAddress);
      if (data === null) {
        throw new Error('Location not found.');
      }
      const { lat, lon, display_name, boundingbox } = data;
      setLocation({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        zoom: 16,
        bbox: [boundingbox[2], boundingbox[0], boundingbox[3], boundingbox[1]],
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
    form.setFieldValue(name, geojson);
    onChange(geojson);
  }, [geojson]);

  return (
    <Form.Item
      label="Location"
      extra="Search for a location using OpenStreetMap."
      initialValue={geojson}
    >
      <Input.Search
        placeholder={`Example: type "${randomCity.current}”`}
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

const GeometryForm = ({
  initialValues,
  onChange,
  onBack,
  onFinish,
  setSecondary,
}) => {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState(initialValues);

  const onUserGeomertyFormFinish = (values) => {
    setFormData((prev) => ({ ...prev, ...values }));

    // Complete geometry form if user geometry is provided
    if (
      values?.user_zone !== GENERATE_ZONE_CEA &&
      values?.user_surroundings !== GENERATE_SURROUNDINGS_CEA
    ) {
      onFinish(values);
    } else {
      // Otherwise, bring to next geometry form
      setCurrent(current + 1);
    }
  };

  const onGenerateGeometryFormFinish = (values) => {
    onFinish({ ...formData, ...values });
  };

  const onGeometryFormBack = () => {
    setCurrent(current - 1);
  };

  const onGeometryFormChange = (values) => {
    // Update geometry form data
    setFormData((prev) => ({ ...prev, ...values }));

    // Update parent form data
    onChange(values);
  };

  useEffect(() => {
    console.log(formData);
  }, [formData]);

  const forms = [
    <UserGeometryForm
      key="user-geometry"
      initialValues={formData}
      onChange={onGeometryFormChange}
      onBack={onBack}
      onFinish={onUserGeomertyFormFinish}
      setSecondary={setSecondary}
    />,
    <GenerateGeometryForm
      key="generate-geometry"
      initialValues={formData}
      onChange={onGeometryFormChange}
      onBack={onGeometryFormBack}
      onFinish={onGenerateGeometryFormFinish}
      setSecondary={setSecondary}
    />,
  ];

  return forms[current];
};

export default GeometryForm;
