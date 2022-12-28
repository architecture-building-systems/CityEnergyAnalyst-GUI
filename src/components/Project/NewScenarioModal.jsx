import { useState, useRef, useEffect } from 'react';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Radio, Input } from 'antd';
import axios from 'axios';
import { useOpenScenario } from './Project';
import CreatingScenarioModal from './CreatingScenarioModal';
import ScenarioGenerateDataForm from './ScenarioGenerateDataForm';
import ScenarioImportDataForm from './ScenarioImportDataForm';
import Parameter from '../Tools/Parameter';
import { withErrorBoundary } from '../../utils/ErrorBoundary';

const NewScenarioModal = ({ visible, setVisible, project }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef();
  const openScenario = useOpenScenario();
  const databaseParameter = useFetchDatabasePathParameter();

  const createScenario = (e) => {
    setError(null);
    const formConfig = { scroll: { offsetTop: 60 } };
    formRef.current.validateFieldsAndScroll(formConfig, async (err, values) => {
      console.debug(values);
      if (!err) {
        setConfirmLoading(true);
        setModalVisible(true);
        console.log('Received values of form: ', values);
        try {
          const resp = await axios.post(
            `${import.meta.env.VITE_CEA_URL}/api/project/scenario/`,
            { project, ...values }
          );
          console.log(resp.data);
          openScenario(project, values.scenario_name.trim());
        } catch (err) {
          console.error(err.response);
          setError(err.response);
        } finally {
          setConfirmLoading(false);
        }
      }
    });
  };

  const handleCancel = (e) => {
    setVisible(false);
  };

  return (
    <Modal
      title="Create new Scenario"
      visible={visible}
      width={800}
      onOk={createScenario}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      okText="Create"
      maskClosable={false}
      destroyOnClose
    >
      <NewScenarioForm
        ref={formRef}
        project={project}
        databaseParameter={databaseParameter}
      />
      <CreatingScenarioModal
        visible={modalVisible}
        setVisible={setModalVisible}
        error={error}
        createScenario={createScenario}
      />
    </Modal>
  );
};

const NewScenarioForm = Form.create()(
  ({ form, project, databaseParameter }) => {
    const choice = form.getFieldValue('input_data');

    return (
      <Form>
        <Form.Item label={<h2 style={{ display: 'inline' }}>Scenario Name</h2>}>
          {form.getFieldDecorator('scenario_name', {
            initialValue: '',
            rules: [
              {
                required: true,
                transform: (value) => value.trim(),
              },
              {
                validator: (rule, value, callback) => {
                  if (
                    value.length != 0 &&
                    fs.existsSync(path.join(project, value))
                  ) {
                    callback('Scenario with name already exists in project');
                  } else {
                    callback();
                  }
                },
              },
            ],
          })(<Input placeholder="Name of new Scenario" />)}
        </Form.Item>

        <h2>Database</h2>
        {databaseParameter !== null && (
          <Parameter form={form} parameter={databaseParameter} />
        )}

        <h2>Input Data</h2>
        <Form.Item>
          {form.getFieldDecorator('input_data', {
            initialValue: 'generate',
          })(
            <Radio.Group>
              <Radio value="generate" style={{ display: 'block' }}>
                Generate new input files using tools
              </Radio>
              <Radio value="import" style={{ display: 'block' }}>
                Import input files
              </Radio>
            </Radio.Group>
          )}
        </Form.Item>

        <ScenarioGenerateDataForm form={form} visible={choice === 'generate'} />
        <ScenarioImportDataForm form={form} visible={choice === 'import'} />
      </Form>
    );
  }
);

const useFetchDatabasePathParameter = () => {
  const [parameter, setParameter] = useState(null);
  useEffect(() => {
    const fetchParameter = async () => {
      try {
        const resp = await axios.get(
          `${import.meta.env.VITE_CEA_URL}/api/tools/data-initializer`
        );
        const dbPathParam =
          resp.data.parameters[
            resp.data.parameters.findIndex(
              (p) => p.type === 'DatabasePathParameter'
            )
          ];
        setParameter({ ...dbPathParam, name: 'databases_path' });
      } catch (err) {
        console.error(err);
      }
    };
    fetchParameter();
  }, []);
  return parameter;
};

export default withErrorBoundary(NewScenarioModal);
