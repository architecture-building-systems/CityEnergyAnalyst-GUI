import { Button, Divider, Form, Select } from 'antd';
import { OpenDialogButton, OpenDialogInput } from '../../Tools/Parameter';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import axios from 'axios';

const GENERATE_TERRAIN_CEA = 'generate-terrain-cea';
const GENERATE_STREET_CEA = 'generate-street-cea';

export const useFetchWeather = () => {
  const [weather, setWeather] = useState([]);

  const fetchWeather = async () => {
    const { data } = await axios.get(
      `${import.meta.env.VITE_CEA_URL}/api/weather`,
    );
    return data;
  };

  useEffect(() => {
    fetchWeather().then(({ weather }) => setWeather(weather));
  }, []);

  return weather;
};

const ContextForm = ({
  weather,
  initialValues,
  onChange,
  onBack,
  onFinish,
}) => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={onChange}
      onFinish={onFinish}
      layout="vertical"
    >
      <Form.Item
        label="Weather data"
        name="weather"
        extra={
          <div>
            <div>Link to a path to weather information in .epw format.</div>
            <div>See an example here.</div>
            <br />
            <div>Where to find such weather files?</div>
            <div>e.g. Energyplus, Ladybug, Southampthon.</div>
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
                <PlusOutlined />
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
                <PlusOutlined />
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
        extra={
          <div>
            <div>
              Link to a path to street centre line geometries in .shp format.
            </div>
            <div>See an example here.</div>
            <br />
            <div>This is used for district thermal network analysis.</div>
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
                <PlusOutlined />
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
                  value: 'none',
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
