import { Button, Checkbox, Form, message } from 'antd';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useState } from 'react';
import { CloudDownloadIcon } from 'assets/icons';
import useDownloadStore from '../stores/downloadStore';

const DownloadForm = () => {
  return (
    <div style={{ userSelect: 'none', padding: '12px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', gap: 12 }}>
          <CloudDownloadIcon style={{ fontSize: 36 }} /> Download Scenario(s)
        </h1>
        <p>
          Select one or more Scenarios to download. Downloads will be prepared
          in the background and you can track their progress in the status bar.
        </p>
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

const validateFileSelection = ({ getFieldValue }) => ({
  validator() {
    const inputFiles = getFieldValue('inputFiles');
    const outputFiles = getFieldValue('outputFiles');
    if (inputFiles || (outputFiles && outputFiles.length > 0)) {
      return Promise.resolve();
    }
    return Promise.reject(
      new Error(
        'Please select at least one option in input files or output files',
      ),
    );
  },
});

const FormContent = () => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentProject = useProjectStore((state) => state.project);
  const prepareDownload = useDownloadStore((state) => state.prepareDownload);

  const onFinish = async (values) => {
    if (!values.scenarios.length) return;
    if (!currentProject) {
      message.error('No project selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await prepareDownload(
        currentProject,
        values.scenarios,
        values.inputFiles,
        values.outputFiles,
      );

      message.success(
        'Download preparation started! Track progress in the status bar.',
      );
      form.resetFields();
    } catch (error) {
      console.error('Failed to start download:', error);
      const detail = error.response?.data?.detail;

      let errorMessage = 'Failed to start download';
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (detail?.message) {
        errorMessage = detail.message;
        // Add suggestion if available for better user guidance
        if (detail.suggestion) {
          errorMessage += `. ${detail.suggestion}`;
        }
      }

      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form form={form} onFinish={onFinish}>
      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        Prepare Download
      </Button>

      <div style={{ display: 'flex', flexDirection: 'column', margin: 12 }}>
        <div>
          <h2>Download Options</h2>
          <div style={{ marginLeft: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
              Input files{' '}
              <small style={{ fontWeight: 'normal' }}>
                (check if you want to include input files in the download)
              </small>
            </div>
            <Form.Item
              name="inputFiles"
              valuePropName="checked"
              initialValue={false}
              dependencies={['outputFiles']}
              rules={[validateFileSelection]}
            >
              <Checkbox disabled={isSubmitting}>
                <div>
                  Database, Building geometries, properties, streets, terrain &
                  weather
                </div>
              </Checkbox>
            </Form.Item>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
              Output files
            </div>
            <Form.Item
              name="outputFiles"
              initialValue={[]}
              dependencies={['inputFiles']}
              rules={[validateFileSelection]}
            >
              <Checkbox.Group
                disabled={isSubmitting}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <Checkbox value="summary">
                  <div>
                    Summary -{' '}
                    <small>
                      A summary of simulated results aggregated by buildings and
                      various time resolutions.
                    </small>
                  </div>
                </Checkbox>
                <Checkbox value="detailed">
                  <div>
                    Output Data -{' '}
                    <small>Includes all output data in CSV format</small>
                  </div>
                </Checkbox>
                <Checkbox value="export">
                  <div>
                    Export files -{' '}
                    <small>
                      Files to export for other software (e.g.,
                      Rhino/Grasshopper)
                    </small>
                  </div>
                </Checkbox>
              </Checkbox.Group>
            </Form.Item>
          </div>
        </div>
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
            <ScenarioCheckboxes disabled={isSubmitting} />
          </Form.Item>
        </div>
      </div>
    </Form>
  );
};

export default DownloadForm;
