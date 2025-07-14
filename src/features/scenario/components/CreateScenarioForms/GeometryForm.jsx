import { Form, InputNumber, Alert } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { FileSearchOutlined } from '@ant-design/icons';
import {
  GENERATE_ZONE_CEA,
  GENERATE_SURROUNDINGS_CEA,
  EMTPY_GEOMETRY,
} from 'features/scenario/constants';
import { FileDialog, SelectWithFileDialog } from './FormInput';
import { MapFormContext } from 'features/scenario/hooks/create-scenario-forms';
import { useFetchBuildingsFromPath } from 'features/map/hooks';
import { isElectron } from 'utils/electron';
import { apiClient } from 'lib/api/axios';
import { useBuildingLimits } from 'stores/serverStore';

const validateGeometry = async (value, buildingType) => {
  if (
    [GENERATE_ZONE_CEA, GENERATE_SURROUNDINGS_CEA, EMTPY_GEOMETRY].includes(
      value,
    )
  )
    return Promise.resolve();
  else if (value === undefined) return Promise.reject();

  try {
    const response = await apiClient.post(`/api/geometry/buildings/validate`, {
      type: 'path',
      building: buildingType,
      path: value,
    });
    console.log(response);
    return Promise.resolve();
  } catch (error) {
    const errorMessage =
      error?.response?.data?.detail || 'Unable to validate geometries.';
    return Promise.reject(`${errorMessage}`);
  }
};

const validateTypology = async (value) => {
  if (value === undefined) return Promise.reject();

  try {
    const response = await apiClient.post(`/api/geometry/typology/validate`, {
      type: 'path',
      path: value,
    });
    console.log(response);
    return Promise.resolve();
  } catch (error) {
    const errorMessage =
      error?.response?.data?.detail || 'Unable to validate typology.';
    return Promise.reject(`${errorMessage}`);
  }
};

const ZoneGeometryFormItem = ({ onValidated }) => {
  const { setBuildings } = useContext(MapFormContext);
  const { fetchBuildings } = useFetchBuildingsFromPath(setBuildings);

  const fileFilters = isElectron()
    ? [{ name: 'SHP files', extensions: ['shp'] }]
    : [{ extensions: ['zip'] }];

  const userZoneValidator = async (_, value) => {
    // FIXME: Validate file input on server side
    if (value instanceof File) return Promise.resolve();

    // Do not check if zone is generated
    if (value === GENERATE_ZONE_CEA) {
      onValidated?.({ valid: true, typology: null });
      return Promise.resolve();
    }

    // Check if zone is valid
    try {
      await validateGeometry(value, 'zone');
      fetchBuildings(value);
    } catch (error) {
      setBuildings(null);
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
        filters={fileFilters}
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
          Import{isElectron() ? ' .shp file' : ' .zip file'}
        </div>
      </SelectWithFileDialog>
    </Form.Item>
  );
};

const GenerateZoneFormItem = ({ form }) => {
  const { fetchedBuildings, polygon, setDrawingMode } =
    useContext(MapFormContext);

  useEffect(() => {
    form.setFieldValue('generate_zone', polygon);
  }, [polygon]);

  // Set drawing mode on mount and disable it on unmount
  useEffect(() => {
    setDrawingMode(true);
    return () => setDrawingMode(false);
  }, []);

  const { limit, count } = useBuildingLimits(
    fetchedBuildings?.features?.length,
  );
  const [error, setError] = useState(null);

  const generateZoneValidator = (_, value) => {
    try {
      if (value?.features?.length) {
        if (!fetchedBuildings?.features?.length) {
          throw new Error('No buildings found in the selected area.');
        }
        if (limit && count <= 0) {
          throw new Error(
            `You have reached the maximum number of buildings (${limit}). Please select a smaller area to continue.`,
          );
        }
      } else {
        throw new Error(
          'Boundary not found. Please draw a boundary on the map.',
        );
      }

      setError(null);
      return Promise.resolve();
    } catch (error) {
      setError(error.message);
      return Promise.reject();
    }
  };

  return (
    <>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <Alert
          // message="Select an area on the map"
          message="On the map, search for a location and draw the boundary of your site."
          type="info"
          showIcon
        />

        {error && <div style={{ color: 'red' }}>{error}</div>}
      </div>
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
  const fileFilters = isElectron()
    ? [{ name: 'SHP files', extensions: ['shp'] }]
    : [{ extensions: ['zip'] }];

  const userSurroundingsValidator = async (_, value) => {
    // FIXME: Validate file input on server side
    if (value instanceof File) return Promise.resolve();
    await validateGeometry(value, 'surroundings');
  };

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
        { validator: userSurroundingsValidator },
      ]}
    >
      <SelectWithFileDialog
        name="user_surroundings"
        type="file"
        filters={fileFilters}
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
          Import{isElectron() ? ' .shp file' : ' .zip file'}
        </div>
      </SelectWithFileDialog>
    </Form.Item>
  );
};

const GenerateSurroundingsFormItem = ({ initialValue = 50 }) => {
  return (
    <Form.Item
      label="Buffer (surroundings)"
      name="generate_surroundings"
      extra="Set the buffer in metres around the Building geometries (zone)."
      rules={[{ required: true, message: 'This field is required.' }]}
      initialValue={initialValue}
    >
      <InputNumber min={1} suffix="m" />
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
      <FileDialog
        name="typology"
        type="file"
        filters={[
          { name: 'Typology formats', extensions: ['csv', 'dbf', 'xlsx'] },
        ]}
        placeholder="Import .xlsx/.csv/.dbf file"
      />
    </Form.Item>
  );
};

const GeometryForm = ({ initialValues, onChange, onFinish, formButtons }) => {
  const [form] = Form.useForm();
  const { fetchedBuildings, setBuildings } = useContext(MapFormContext);

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

  const handleFormFinish = (values) => {
    if (values.user_zone === GENERATE_ZONE_CEA) {
      // Set buildings to fetched buildings if zone is generated
      setBuildings(fetchedBuildings);
    }
    onFinish?.(values);
  };

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={handleFormFinish}
      layout="vertical"
    >
      {formButtons}

      <ZoneGeometryFormItem onValidated={onZoneValidated} />
      {showTypologyForm && <TypologyFormItem />}
      {initialValues?.user_zone === GENERATE_ZONE_CEA && (
        <GenerateZoneFormItem form={form} />
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
