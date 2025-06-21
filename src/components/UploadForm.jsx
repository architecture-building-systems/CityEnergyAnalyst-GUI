import { CloudUploadIcon } from '../assets/icons';
import { Button, Form, Input, message, Radio, Select, Upload } from 'antd';
import Dragger from 'antd/es/upload/Dragger';
import JSZip from 'jszip';
import { useMemo, useState } from 'react';
import { useFetchProjectChoices } from './Project/hooks';
import { useProjectStore } from './Project/store';

const UploadForm = () => {
  return (
    <div style={{ userSelect: 'none', padding: '12px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', gap: 12 }}>
          <CloudUploadIcon style={{ fontSize: 36 }} /> Upload Scenario(s)
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

const UploadProjectSelection = ({
  value = {},
  onChange,
  currentProject,
  projectList,
}) => {
  const [typeValue, setTypeValue] = useState('current');
  const [existingProject, setExistingProject] = useState(null);
  const [newProject, setNewProject] = useState(null);

  const options = useMemo(
    () =>
      projectList
        ? projectList
            .filter((choice) => choice !== currentProject)
            .map((choice) => ({
              label: choice,
              value: choice,
            }))
        : [],
    [projectList, currentProject],
  );

  const handleTypeChange = (e) => {
    const newValue = e.target.value;
    setTypeValue(newValue);

    switch (newValue) {
      case 'current':
        onChange?.({
          type: newValue,
          project: currentProject,
        });
        break;
      case 'existing':
        onChange?.({
          type: newValue,
          project: existingProject,
        });
        break;
      case 'new':
        onChange?.({
          type: newValue,
          project: newProject,
        });
        break;
      default:
        throw new Error('Invalid type');
    }
  };

  const handleExistingProjectChange = (e) => {
    const newValue = e;
    setExistingProject(newValue);
    onChange?.({ ...value, project: newValue });
  };

  const handleNewProjectChange = (e) => {
    const newValue = e.target.value;
    setNewProject(newValue);
    onChange?.({ ...value, project: newValue });
  };

  return (
    <Radio.Group
      value={value?.type ?? typeValue}
      onChange={handleTypeChange}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Radio value="current">
        Add to current Project:{' '}
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {currentProject}
        </span>
      </Radio>
      <Radio value="existing">Add to an existing Project</Radio>
      {value?.type === 'existing' && (
        <Select
          options={options}
          placeholder="Select a Project"
          onChange={handleExistingProjectChange}
          value={existingProject}
        />
      )}

      <Radio value="new">Create a new Project</Radio>
      {value?.type === 'new' && (
        <Input
          placeholder="Project Name"
          onChange={handleNewProjectChange}
          value={newProject}
        />
      )}
    </Radio.Group>
  );
};

const extractScenarios = (zipName, files) => {
  // FIXME: We are only using zone geometry folder structure to determine if a folder is a valid scenario
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

  if (scenarioNames.length === 0) {
    throw new Error('No scenarios found in archive.');
  }

  return scenarioNames;
};

const FileUploadBox = ({ onChange, onFinish, onRemove, fileList, status }) => {
  const [hideBox, setHideBox] = useState(false);

  const _fileList = useMemo(
    () => fileList?.map((file) => ({ ...file, ...status })),
    [fileList, status],
  );

  const beforeUpload = async (file) => {
    // Do basic checks first
    try {
      if (file.type !== 'application/zip') {
        throw new Error('File type must be .zip');
      }

      const fileSizeInGB = file.size / 1024 ** 3;
      if (fileSizeInGB > 1) {
        throw new Error('File size must be less than 1GB');
      }
    } catch (e) {
      console.error(e);
      message.error(e.message);
      return Upload.LIST_IGNORE;
    }

    // Check files in archive
    const jszip = new JSZip();
    try {
      const zip = await jszip.loadAsync(file);
      const scenarios = extractScenarios(file.name, zip.files);
      setHideBox(true);
      onFinish?.(scenarios);
    } catch (e) {
      onFinish?.([]);
      console.error(e);
      message.error(e.message);
    }

    return false;
  };

  const handleOnRemove = () => {
    setHideBox(false);
    onRemove?.();
  };

  return (
    <Dragger
      accept=".zip"
      maxCount={1}
      beforeUpload={beforeUpload}
      onChange={onChange}
      onRemove={handleOnRemove}
      showUploadList={{
        extra: ({ size = 0 }) => (
          <span style={{ color: '#cccccc' }}>
            {' '}
            ({(size / 1024 / 1024).toFixed(2)}MB)
          </span>
        ),
      }}
      style={{
        background: '#8eb6dc',
        color: '#fff',
        display: hideBox ? 'none' : 'block',
      }}
      fileList={_fileList}
    >
      <p className="antd-upload-text">
        {'Click or drag your .zip file containing CEA Scenarios.'}
      </p>
    </Dragger>
  );
};

const FormContent = () => {
  const [form] = Form.useForm();
  const [scenarios, setScenarios] = useState([]);

  const projectList = useFetchProjectChoices();
  const currentProject = useProjectStore((state) => state.project);

  const [uploadStatus, setUploadStatus] = useState({
    status: null,
    progress: null,
  });

  const onUploadRemove = () => {
    setUploadStatus({ status: null, progress: null });
    setScenarios([]);
    // Ensure form is reset
    form.resetFields();
  };

  const onFinish = async (values) => {
    // Create FormData and append file
    const formData = new FormData();
    const file = values.upload?.[0]?.originFileObj;
    formData.append('file', file);
    formData.append('type', values.project.type);
    formData.append('project', values.project.project);

    // Use fetch with progress tracking
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        console.log(percent);
        // Update progress state here
        setUploadStatus({ status: 'uploading', progress: percent });
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        message.success('Upload completed');
        setUploadStatus({ status: 'done', progress: null });
      } else {
        message.error('Upload failed');
        setUploadStatus({ status: 'error', progress: null });
      }
    };

    xhr.open(
      'POST',
      `${import.meta.env.VITE_CEA_URL}/api/contents/scenario/upload`,
      true,
    );
    xhr.send(formData);
  };

  const validateProject = (_, value) => {
    if (value?.type == 'existing' && !value?.project) {
      return Promise.reject(new Error('Select a project.'));
    }

    if (value?.type == 'new' && !value?.project) {
      return Promise.reject(new Error('Enter a project name.'));
    }

    if (value?.type == 'new' && projectList.includes(value?.project)) {
      return Promise.reject(new Error('Project name already exists.'));
    }

    return Promise.resolve();
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      style={{ display: 'flex', flexDirection: 'column', margin: 12, gap: 12 }}
    >
      <Form.Item
        name="upload"
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
          onRemove={onUploadRemove}
          status={uploadStatus}
        />
      </Form.Item>
      <UploadScenarioList scenarioList={scenarios} />
      {scenarios.length > 0 && (
        <>
          <Form.Item
            name="project"
            initialValue={{ type: 'current', project: currentProject }}
            rules={[{ validator: validateProject }]}
          >
            <UploadProjectSelection
              currentProject={currentProject}
              projectList={projectList}
            />
          </Form.Item>

          <Button type="primary" htmlType="submit">
            Upload
          </Button>
        </>
      )}
    </Form>
  );
};

export default UploadForm;
