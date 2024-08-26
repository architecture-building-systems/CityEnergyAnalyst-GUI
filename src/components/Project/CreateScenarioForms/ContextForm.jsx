import { Button, Divider, Form, Select } from 'antd';
import { OpenDialogButton } from '../../Tools/Parameter';
import { FileSearchOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import {
  EMTPY_GEOMETRY,
  GENERATE_STREET_CEA,
  GENERATE_TERRAIN_CEA,
} from './constants';
import axios from 'axios';

const countryMap = {
  SG: 'Singapore',
  CH: 'Switzerland',
  DE: 'Germany',
};

const weatherSources = {
  ladybug: 'https://www.ladybug.tools/epwmap/',
  energyplus: 'https://energyplus.net/weather',
  southampton: 'https://energy.soton.ac.uk/ccworldweathergen/',
};

const validateDatabase = async (value, databases) => {
  // Do not need to validate CEA databases
  if (databases.includes(value)) return Promise.resolve();

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_CEA_URL}/api/databases/validate`,
      {
        type: 'path',
        path: value,
      },
    );
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
  onBack,
  onFinish,
  onMount,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    onMount?.();
  }, []);

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item
        label="Database"
        name="database"
        extra="Select a Database from CEA or link to your own."
        rules={[
          { required: true, message: 'Please select a database.' },
          { validator: (_, value) => validateDatabase(value, databases) },
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
                name="database"
                type="directory"
                placeholder="Or enter path to database folder here"
              >
                <FileSearchOutlined />
                Browse for databases path
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Databases',
              options: databases.map((database) => ({
                label: `${database} - ${countryMap?.[database] || database}`,
                value: database,
              })),
            },
          ]}
        />
      </Form.Item>
      <Form.Item
        label="Weather data"
        name="weather"
        tooltip={{
          title: (
            <>
              <div>Some websites to find .epw files:</div>
              <div>
                <a href={weatherSources.energyplus}>Energyplus</a>
                <br />
                <a href={weatherSources.ladybug}>Ladybug</a>
                <br />
                <a href={weatherSources.southampton}>Southampthon</a>
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
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="weather"
                type="file"
                filters={[{ name: 'Weather files', extensions: ['epw'] }]}
                placeholder="Or enter path to weather file here"
              >
                <FileSearchOutlined />
                Browse for weather file
              </OpenDialogButton>
            </div>
          )}
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
        />
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
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="terrain"
                type="file"
                filters={[
                  { name: 'Terrain files', extensions: ['tif', 'tiff'] },
                ]}
                placeholder="Or enter path to terrain file here"
              >
                <FileSearchOutlined />
                Browse for terrain file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Tools',
              options: [
                {
                  label: 'Generate from Tilezen using CEA',
                  value: GENERATE_TERRAIN_CEA,
                },
              ],
            },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="Street (centre line) geometries"
        name="street"
        tooltip={{
          title: <div>This is used for district thermal network analysis.</div>,
        }}
        extra={
          <div>
            <div>
              Link to a path to street centre line geometries in .shp format.
            </div>
            <div>See an example here.</div>
          </div>
        }
        rules={[{ required: true }]}
      >
        <Select
          placeholder="Choose an option from the dropdown"
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="street"
                type="file"
                filters={[{ name: 'SHP files', extensions: ['shp'] }]}
                placeholder="Or enter path to street geometry file here"
              >
                <FileSearchOutlined />
                Browse for street geometry file
              </OpenDialogButton>
            </div>
          )}
          options={[
            {
              label: 'CEA Tools',
              options: [
                {
                  label: 'Generate from OpenStreetMap using CEA',
                  value: GENERATE_STREET_CEA,
                },
              ],
            },
            {
              label: 'None',
              options: [
                {
                  label: 'No street geometries',
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
            Finish
          </Button>
          <Button style={{ padding: '0 36px' }} onClick={onBack}>
            Back
          </Button>
        </div>
      </Form.Item>
    </Form>
  );
};

export default ContextForm;
