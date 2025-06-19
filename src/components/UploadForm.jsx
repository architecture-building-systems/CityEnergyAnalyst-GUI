import { CloudUploadOutlined } from '@ant-design/icons';
import { Checkbox, Form, Input, message, Select, Upload } from 'antd';
import Dragger from 'antd/es/upload/Dragger';
import JSZip from 'jszip';
import { useState } from 'react';

const UploadForm = () => {
  return (
    <div style={{ userSelect: 'none', padding: '12px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1>
          <CloudUploadOutlined style={{ fontSize: 36 }} /> Upload Scenario(s)
        </h1>
        <p>Upload one or more CEA Scenarios.</p>
      </div>

      <FormContent />
    </div>
  );
};

const UploadScenarioList = ({ scenarioList }) => {
  if (!scenarioList || scenarioList.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 'bolder', marginBottom: 12 }}>
        Scenarios found in archive
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          borderRadius: 12,
          border: '1px solid #eee',
          padding: 12,
          marginBottom: 24,
        }}
      >
        {scenarioList.map((file) => (
          <div key={file} style={{ marginLeft: 12 }}>
            <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
              {file}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const extractScenarios = (zipName, files) => {
  // FIXME: We are only using zone geometry folder structure to determine if a folder is a valid scenario
  console.log(zipName, files);
  // Find zone.shp files in archive to determine scenario
  const zoneFiles = Object.keys(files).filter((name) =>
    name.endsWith('inputs/building-geometry/zone.shp'),
  );

  // Ignore if no zone files found
  if (zoneFiles.length === 0) {
    throw new Error('No zone geometry files found in archive.');
  }

  // Case 1: Only one scenario and name is zip name e.g. inputs/
  if (zoneFiles.length === 1 && zoneFiles[0].startsWith('inputs/')) {
    const scenarioName = zipName.slice(0, -4);
    return [scenarioName];
  }
  const scenarioNames = zoneFiles
    .map((name) => {
      // FIXME: Split might not work if there are multiple slashes in a row
      const parts = name.split('/');
      // Case 2: Scenario names are the first level folder names e.g. scenario/inputs/..
      if (parts[1] === 'inputs') return parts[0];
      // Case 3: Project name is the first level folder name e.g. project/scenario/inputs/..
      else if (parts[2] === 'inputs') return parts[1];
      return null;
    })
    .filter((name) => name !== null);

  console.log('scenarioNames', scenarioNames);

  if (scenarioNames.length === 0) {
    throw new Error('No scenarios found in archive.');
  }

  return scenarioNames;
};

const FileUploadBox = ({ onFinish, onRemove }) => {
  const beforeUpload = async (file) => {
    if (file.type !== 'application/zip') {
      console.error('File type must be .zip');
      return Upload.LIST_IGNORE;
    }

    const fileSizeInGB = file.size / 1024 ** 3;
    if (fileSizeInGB > 1) {
      console.error('File size must be less than 1GB');
      return Upload.LIST_IGNORE;
    }

    const jszip = new JSZip();
    try {
      const zip = await jszip.loadAsync(file);
      const scenarios = extractScenarios(file.name, zip.files);
      onFinish?.(scenarios);
    } catch (e) {
      onFinish?.([]);
      console.error(e);
      message.error(e.message);
    }

    return false;
  };

  return (
    <Dragger
      accept=".zip"
      maxCount={1}
      beforeUpload={beforeUpload}
      onChange={(e) => console.log('onChange', e)}
      onRemove={onRemove}
      showUploadList={{
        extra: ({ size = 0 }) => (
          <span style={{ color: '#cccccc' }}>
            ({(size / 1024 / 1024).toFixed(2)}MB)
          </span>
        ),
      }}
      style={{ background: '#8eb6dc', color: '#fff' }}
    >
      <p className="antd-upload-text">
        {'Click or drag your .zip file containing CEA Scenarios.'}
      </p>
    </Dragger>
  );
};

const FormContent = ({ form, onFinish }) => {
  const [scenarios, setScenarios] = useState([]);

  return (
    <Form
      form={form}
      onFinish={onFinish}
      style={{ display: 'flex', flexDirection: 'column', margin: 12 }}
    >
      <Form.Item
        name="input-files"
        valuePropName="fileList"
        getValueFromEvent={(e) => {
          if (Array.isArray(e)) {
            return e;
          }
          return e && e.fileList;
        }}
      >
        <FileUploadBox
          onFinish={setScenarios}
          onRemove={() => setScenarios([])}
        />
      </Form.Item>

      <UploadScenarioList scenarioList={scenarios} />

      {scenarios.length > 0 && (
        <Form.Item name="project">
          <Checkbox.Group
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <Checkbox value="current">
              Add to Current Project
              <Select />
            </Checkbox>
            <Checkbox value="new">
              Create a new Project
              <Input />
            </Checkbox>
          </Checkbox.Group>
        </Form.Item>
      )}
    </Form>
  );
};

export default UploadForm;
