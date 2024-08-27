import { Form, Button, InputNumber, Input } from 'antd';
import { useContext, useEffect, useRef, useState } from 'react';
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
import { SelectWithFileDialog } from './FormInput';

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

const ZoneGeometryFormItem = ({ onValidated }) => {
  const userZoneValidator = async (_, value) => {
    // Do not check if zone is generated
    if (value === GENERATE_ZONE_CEA) {
      onValidated?.({ valid: true, typology: null });
      return Promise.resolve();
    }

    // Check if zone is valid
    try {
      await validateGeometry(value, 'zone');
    } catch (error) {
      onValidated?.({ valid: false, typology: null });
      return Promise.reject(error);
    }

    // Check if typology in zone
    try {
      await validateTypology(value);
      onValidated?.({ valid: true, typology: true });
    } catch (error) {
      onValidated?.({ valid: true, typology: false });
    }

    return Promise.resolve();
  };

  return (
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
        { validator: userZoneValidator },
      ]}
    >
      <SelectWithFileDialog
        name="user_zone"
        type="file"
        filters={[{ name: 'SHP files', extensions: ['shp'] }]}
        placeholder="Choose an option from the dropdown"
        options={[
          {
            label: 'Generate from OpenStreetMap',
            value: GENERATE_ZONE_CEA,
          },
        ]}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
          <FileSearchOutlined />
          Import .shp file
        </div>
      </SelectWithFileDialog>
    </Form.Item>
  );
};

const GenerateZoneFormItem = () => {
  const generateZoneValidator = (_, value) =>
    value?.features?.length
      ? Promise.resolve()
      : Promise.reject(
          new Error(
            'Area geometry not found. Please select an area on the map by drawing a polygon.',
          ),
        );

  return (
    <>
      <Form.Item
        name="generate_zone"
        rules={[
          {
            validator: generateZoneValidator,
          },
        ]}
        hidden
      />
    </>
  );
};

const SurroundingsGeometryFormItem = () => {
  return (
    <Form.Item
      label="Building geometries (surroundings)"
      name="user_surroundings"
      tooltip={{
        title: (
          <div>
            This is used for shading effects in Building Solar Radiation.
          </div>
        ),
      }}
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
      <SelectWithFileDialog
        name="user_surroundings"
        type="file"
        filters={[{ name: 'SHP files', extensions: ['shp'] }]}
        placeholder="Choose an option from the dropdown"
        options={[
          {
            label: 'Generate from OpenStreetMap',
            value: GENERATE_SURROUNDINGS_CEA,
          },
          {
            label: 'No surrounding buildings',
            value: EMTPY_GEOMETRY,
          },
        ]}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
          <FileSearchOutlined />
          Import .shp file
        </div>
      </SelectWithFileDialog>
    </Form.Item>
  );
};

const GenerateSurroundingsFormItem = ({ initialValue }) => {
  return (
    <Form.Item
      label="Generate surroundings geometry"
      name="generate_surroundings"
      extra="Set the buffer in meters around the zone buildings."
      rules={[{ required: true, message: 'This field is required.' }]}
      initialValue={initialValue || 50}
    >
      <InputNumber min={1} />
    </Form.Item>
  );
};

const TypologyFormItem = () => {
  return (
    <Form.Item
      label="Building information (typology)"
      name="typology"
      extra={
        <div>
          <div>
            Link to a path to building information in .xlsx/.csv/.dbf format.
          </div>
          <div>See an example here.</div>
        </div>
      }
      rules={[
        { required: true, message: 'This field is required.' },
        { validator: (_, value) => validateTypology(value) },
      ]}
    >
      <SelectWithFileDialog
        name="typology"
        type="file"
        filters={[{ name: 'DBF files', extensions: ['dbf'] }]}
        placeholder="Choose an option from the dropdown"
        options={[
          {
            label: 'Auto-generate using default values',
            value: GENERATE_TYPOLOGY_CEA,
          },
        ]}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
          <FileSearchOutlined />
          Import .dbf file
        </div>
      </SelectWithFileDialog>
    </Form.Item>
  );
};

const GeometryForm = ({ initialValues, onChange, onFinish, formButtons }) => {
  const [showTypologyForm, setTypologyVisibility] = useState(
    initialValues?.typology_in_zone || false,
  );

  const handleTyologyVisibility = (value) => {
    setTypologyVisibility(value);

    // Store value in parent form to avoid validating zone again on form change
    onChange?.({ typology_in_zone: value });
  };

  const onZoneValidated = ({ valid, typology }) => {
    // Only show typology form if zone is valid and typology is not found
    if (valid && typology == false) handleTyologyVisibility(true);
    else handleTyologyVisibility(false);
  };

  return (
    <Form
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={onFinish}
      layout="vertical"
    >
      {formButtons}

      <ZoneGeometryFormItem onValidated={onZoneValidated} />
      {showTypologyForm && <TypologyFormItem />}
      {initialValues?.user_zone === GENERATE_ZONE_CEA && (
        <GenerateZoneFormItem />
      )}

      <SurroundingsGeometryFormItem />
      {initialValues?.user_surroundings === GENERATE_SURROUNDINGS_CEA && (
        <GenerateSurroundingsFormItem
          initialValue={initialValues?.generate_surroundings}
        />
      )}
    </Form>
  );
};

export default GeometryForm;
