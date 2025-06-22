import { Button, Checkbox, Form, message, Progress } from 'antd';
import { useProjectStore } from './Project/store';
import { useState } from 'react';
import { CloudDownloadIcon } from '../assets/icons';

const DownloadForm = () => {
  return (
    <div style={{ userSelect: 'none', padding: '12px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', gap: 12 }}>
          <CloudDownloadIcon style={{ fontSize: 36 }} /> Download Scenario(s)
        </h1>
        <p>Select one or more Scenarios to download.</p>
      </div>

      <FormContent />
    </div>
  );
};

const ScenarioCheckboxes = ({ onChange, disabled }) => {
  const scenariosList = useProjectStore((state) => state.scenariosList);
  const [checkedList, setCheckedList] = useState([]);
  const checkAll = scenariosList.length === checkedList.length;
  const indeterminate =
    checkedList.length > 0 && checkedList.length < scenariosList.length;

  const onChechboxChange = (list) => {
    setCheckedList(list);
    onChange?.(list);
  };
  const onCheckAllChange = (e) => {
    const newValue = e.target.checked ? scenariosList : [];
    setCheckedList(newValue);
    onChange?.(newValue);
  };

  if (scenariosList.length === 0) return null;

  return (
    <>
      <Checkbox
        style={{ marginBottom: 12 }}
        indeterminate={indeterminate}
        onChange={onCheckAllChange}
        checked={checkAll}
        disabled={disabled}
      >
        Select All
      </Checkbox>

      <Checkbox.Group
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginLeft: 12,
        }}
        value={checkedList}
        onChange={onChechboxChange}
        disabled={disabled}
      >
        {scenariosList.map((scenario) => (
          <Checkbox
            value={scenario}
            key={scenario}
            style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
          >
            {scenario}
          </Checkbox>
        ))}
      </Checkbox.Group>
    </>
  );
};

const FormContent = () => {
  const [form] = Form.useForm();

  const currentProject = useProjectStore((state) => state.project);

  const [downloadStatus, setDownloadStatus] = useState({
    status: null,
    percent: null,
  });
  const [downloadSize, setDownloadSize] = useState({
    loaded: null,
    total: null,
  });

  const resetDownloadState = () => {
    setDownloadStatus({ status: null, percent: null });
    setDownloadSize({ loaded: null, total: null });
  };

  const disableForm = downloadStatus.status !== null;

  const onFinish = async (values) => {
    if (!values.scenarios.length) return;
    setDownloadStatus({ status: 'preparing', percent: null });

    // TODO: Cancel on unmount
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        setDownloadSize({
          loaded: (event.loaded / 1024 / 1024).toFixed(2),
          total: (event.total / 1024 / 1024).toFixed(2),
        });
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        // Update UI with download progress
        setDownloadStatus({ status: 'downloading', percent: percentComplete });
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        // Extract filename from Content-Disposition header if available
        const contentDisposition = xhr.getResponseHeader('Content-Disposition');
        let filename = 'scenarios.zip';
        if (contentDisposition) {
          const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
            contentDisposition,
          );
          if (match && match[1]) {
            filename = match[1].replace(/['"]/g, '');
          }
        }

        // Create a download from the response without keeping the whole blob in memory
        const url = window.URL.createObjectURL(xhr.response);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;

        // Use click() directly instead of appending to document
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Clean up to free memory
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      } else {
        // Handle download errors
        console.error('Download failed with status:', xhr.status);
        try {
          // Try to parse error response
          const errorBlob = xhr.response;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorJson = JSON.parse(reader.result);
              message.error(
                `Download failed: ${errorJson.detail || errorJson.message || 'Unknown error'}`,
              );
            } catch (e) {
              message.error(`Download failed with status: ${xhr.status}`);
            }
          };
          reader.readAsText(errorBlob);
        } catch (e) {
          message.error(`Download failed with status: ${xhr.status}`);
        }
      }
      resetDownloadState();
    };

    // Add credentials for consistent auth
    xhr.withCredentials = true;

    // Add error handler
    xhr.onerror = () => {
      message.error('Network error occurred during download');
      resetDownloadState();
    };
    xhr.open(
      'POST',
      `${import.meta.env.VITE_CEA_URL}/api/contents/scenario/download`,
      true,
    );
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(
      JSON.stringify({
        project: currentProject,
        scenarios: values.scenarios,
        input_files: values.inputFiles,
      }),
    );
  };

  return (
    <Form form={form} onFinish={onFinish}>
      <Button type="primary" htmlType="submit" loading={disableForm}>
        Download
      </Button>

      {downloadStatus.status === 'preparing' && (
        <div style={{ marginTop: 16 }}>Preparing download...</div>
      )}

      {downloadStatus.status === 'downloading' && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={downloadStatus.percent} status="active" />

          <div style={{ marginTop: 8 }}>
            <span>Downloaded: </span>
            <span>{downloadSize.loaded}</span>
            <span>/</span>
            <span>{downloadSize.total}</span>
            <span>MB</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', margin: 12 }}>
        <Form.Item
          name="inputFiles"
          valuePropName="checked"
          initialValue={false}
        >
          <Checkbox disabled={disableForm}>
            Check to download the input files only
            <br />
            (i.e. Building geometries, properties, streets, terrain, Database &
            weather)
          </Checkbox>
        </Form.Item>

        <div>
          <h2>Available Scenarios</h2>
          <Form.Item
            name="scenarios"
            initialValue={[]}
            rules={[
              {
                required: true,
                validator: (_, value) =>
                  value && value.length > 0
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error('Please select at least one scenario'),
                      ),
              },
            ]}
          >
            <ScenarioCheckboxes disabled={disableForm} />
          </Form.Item>
        </div>
      </div>
    </Form>
  );
};

export default DownloadForm;
