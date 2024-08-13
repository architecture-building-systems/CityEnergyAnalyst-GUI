import { Button, Divider, Form, Input, Select } from 'antd';
import { OpenDialogButton } from '../../Tools/Parameter';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import axios from 'axios';

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
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <OpenDialogButton
                form={form}
                name="weather"
                type="file"
                filters={[{ name: 'Weather files', extensions: ['epw'] }]}
                placeholder="or enter path to weather file"
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
                  label: <span> Fetch from climate.onebuilding.org</span>,
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
        <OpenDialogButton
          form={form}
          name="terrain"
          type="file"
          filters={[{ name: 'Terrain files', extensions: ['tif', 'tiff'] }]}
        >
          <PlusOutlined />
          Browse for terrain file
        </OpenDialogButton>
      </Form.Item>

      <Form.Item
        label="Street (centre line) geometry"
        name="street"
        extra={
          <div>
            <div>
              Link to a path to street centre line geometry in .shp format.
            </div>
            <div>See an example here.</div>
            <br />
            <div>This is used for district thermal network analysis.</div>
          </div>
        }
        rules={[{ required: true }]}
      >
        <OpenDialogButton
          form={form}
          name="street"
          type="file"
          filters={[{ name: 'SHP files', extensions: ['shp'] }]}
        >
          <PlusOutlined />
          Browse for street file
        </OpenDialogButton>
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
