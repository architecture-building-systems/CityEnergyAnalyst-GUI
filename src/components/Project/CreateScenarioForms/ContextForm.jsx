import { Form } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import {
  EMTPY_GEOMETRY,
  GENERATE_STREET_CEA,
  GENERATE_TERRAIN_CEA,
} from './constants';
import { isElectron, openExternal } from '../../../utils/electron';
import { SelectWithFileDialog } from './FormInput';
import { apiClient } from '../../../api/axios';

const countryMap = {
  SG: 'Singapore',
  CH: 'Switzerland',
  DE: 'Germany',
};

const weatherSources = [
  {
    label: 'Weather Data (EnergyPlus)',
    url: 'https://energyplus.net/weather',
  },
  {
    label: 'EPW Map (Ladybug Tools)',
    url: 'https://www.ladybug.tools/epwmap/',
  },
  {
    label: 'CCWorldWeatherGen',
    url: 'https://energy.soton.ac.uk/ccworldweathergen/',
  },
];

const validateDatabase = async (value, databases) => {
  // Do not need to validate CEA databases
  if (databases.includes(value)) return Promise.resolve();

  try {
    const response = await apiClient.post(`/api/databases/validate`, {
      type: 'path',
      path: value,
    });
    console.log(response);
    return Promise.resolve();
  } catch (error) {
    const errorMessage =
      error?.response?.data?.detail || 'Unable to validate database.';
    return Promise.reject(`${errorMessage}`);
  }
};

const ContextForm = ({
  databases = [],
  weather = [],
  initialValues,
  onChange,
  onFinish,
  formButtons,
}) => {
  const [form] = Form.useForm();

  const streetFilters = isElectron()
    ? [{ name: 'SHP files', extensions: ['shp'] }]
    : [{ extensions: ['zip'] }];

  const userDatabaseValidator = async (_, value) => {
    // FIXME: Validate file input on server side
    if (value instanceof File) return Promise.resolve();
    await validateDatabase(value, databases);
  };

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={onFinish}
      layout="vertical"
    >
      {formButtons}
      <Form.Item
        label="Database"
        name="database"
        extra="Select a Database from CEA or link to your own."
        rules={[
          { required: true, message: 'Please select a database.' },
          { validator: userDatabaseValidator },
        ]}
      >
        <SelectWithFileDialog
          placeholder="Choose an option from the dropdown"
          name="database"
          type={isElectron() ? 'directory' : 'file'}
          filters={isElectron() ? null : [{ extensions: ['zip'] }]}
          options={[
            {
              label: 'CEA Built-in',
              options: databases.map((database) => ({
                label: `${database} - ${countryMap?.[database] || database}`,
                value: database,
              })),
            },
          ]}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
            <FileSearchOutlined />
            Import database from{isElectron() ? ' directory' : ' .zip file'}
          </div>
        </SelectWithFileDialog>
      </Form.Item>

      <Form.Item
        label="Weather data"
        name="weather"
        tooltip={{
          title: (
            <>
              <div>Some websites to find .epw files:</div>
              <div>
                {weatherSources.map((source) => (
                  <button
                    key={source.url}
                    onClick={() => {
                      const url = source.url;
                      if (isElectron()) openExternal(url);
                      else window.open(url, '_blank', 'noreferrer');
                    }}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            </>
          ),
        }}
        extra={
          <div>
            <div>Link to a path to weather information in .epw format.</div>
            <div>See an example here.</div>
          </div>
        }
        rules={[{ required: true }]}
      >
        <SelectWithFileDialog
          placeholder="Choose an option from the dropdown"
          name="weather"
          type="file"
          filters={[{ name: 'Weather files', extensions: ['epw'] }]}
          options={[
            {
              label: 'Third-party sources',
              options: [
                {
                  label: 'Fetch from climate.onebuilding.org',
                  value: 'climate.onebuilding.org',
                },
              ],
            },
            {
              label: 'CEA Built-in',
              options: weather.map((choice) => {
                return {
                  label: choice,
                  value: choice,
                };
              }),
            },
          ]}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
            <FileSearchOutlined />
            Import .epw file
          </div>
        </SelectWithFileDialog>
      </Form.Item>

      <Form.Item
        label="Terrain data"
        name="terrain"
        extra={
          <div>
            <div>Link to a path to terrain file in .tif/.tiff format.</div>
            <div>See an example here.</div>
          </div>
        }
        rules={[{ required: true }]}
      >
        <SelectWithFileDialog
          placeholder="Choose an option from the dropdown"
          name="terrain"
          type="file"
          filters={[{ name: 'Terrain files', extensions: ['tif', 'tiff'] }]}
          options={[
            {
              label: 'Third-party sources',
              options: [
                {
                  label: 'Fetch from registry.opendata.aws/terrain-tiles',
                  value: GENERATE_TERRAIN_CEA,
                },
              ],
            },
          ]}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'left' }}>
            <FileSearchOutlined />
            Import .tif/.tiff file
          </div>
        </SelectWithFileDialog>
      </Form.Item>

      <Form.Item
        label="Street (centreline) geometries"
        name="street"
        tooltip={{
          title: <div>This is used for district thermal network analysis.</div>,
        }}
        extra={
          <div>
            <div>
              Link to a path to street centreline geometries in .shp format.
            </div>
            <div>See an example here.</div>
          </div>
        }
        rules={[{ required: true }]}
      >
        <SelectWithFileDialog
          placeholder="Choose an option from the dropdown"
          name="street"
          type="file"
          filters={streetFilters}
          options={[
            {
              label: 'Generate from OpenStreetMap',
              value: GENERATE_STREET_CEA,
            },
            {
              label: 'No street geometries',
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
    </Form>
  );
};

export default ContextForm;
