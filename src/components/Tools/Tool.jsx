import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Form } from '@ant-design/compatible';
import {
  Skeleton,
  Divider,
  Collapse,
  Button,
  Spin as AntSpin,
  Alert,
} from 'antd';
import {
  fetchToolParams,
  saveToolParams,
  setDefaultToolParams,
  resetToolParams,
} from '../../actions/tools';
import { createJob } from '../../actions/jobs';
import Parameter from './Parameter';
import { withErrorBoundary } from '../../utils/ErrorBoundary';
import { AsyncError } from '../../utils/AsyncError';

import './Tool.css';
import axios from 'axios';

export const ToolRoute = ({ match }) => {
  return <Tool script={match.params.script} />;
};

const useCheckMissingInputs = (tool) => {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      setFetching(true);
      try {
        await axios.get(
          `${import.meta.env.VITE_CEA_URL}/api/tools/${tool}/check`,
        );
        setError(null);
      } catch (err) {
        console.error(err.response.data);
        setError(err.response.data?.detail?.script_suggestions);
      } finally {
        setFetching(false);
      }
    };

    fetch();
  }, [tool]);

  return { fetching, error };
};

const ScriptSuggestions = ({ script, onMissingInputs }) => {
  const { fetching, error } = useCheckMissingInputs(script);

  console.log({ error });
  useEffect(() => {
    onMissingInputs?.(error?.length || false);
  }, [error]);

  if (fetching) return <Skeleton active />;
  if (error)
    return (
      <Alert
        message="Missing inputs"
        description={
          <div>
            <p>Run the following scripts to find missing inputs:</p>
            {error?.length ? (
              <div>
                {error.map(({ label, name }) => {
                  return <div key={name}>`{label}`</div>;
                })}
              </div>
            ) : (
              <div>Something went wrong</div>
            )}
          </div>
        }
        type="info"
        showIcon
      />
    );
  return null;
};

const Tool = withErrorBoundary(({ script }) => {
  const { status, error, params } = useSelector((state) => state.toolParams);
  const dispatch = useDispatch();
  const {
    category,
    label,
    description,
    parameters,
    categorical_parameters: categoricalParameters,
  } = params;

  // Disable form buttons until inputs are found
  const [missingInputs, setMissingInputs] = useState(true);

  useEffect(() => {
    dispatch(fetchToolParams(script));
    return () => dispatch(resetToolParams());
  }, [script]);

  if (status == 'fetching') return <Skeleton active />;
  if (status == 'failed') {
    return <AsyncError error={error} />;
  }
  if (!label) return null;

  return (
    <div>
      <Spin>
        <h3>{category}</h3>
        <h2 style={{ display: 'inline' }}>{label}</h2>
        <p>
          <small style={{ whiteSpace: 'pre-line' }}>{description}</small>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ScriptSuggestions
            script={script}
            onMissingInputs={setMissingInputs}
          />

          <ToolForm
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            disableButtons={missingInputs}
          />
        </div>
      </Spin>
    </div>
  );
});

const ToolForm = Form.create()(({
  parameters,
  categoricalParameters,
  script,
  form,
  disableButtons,
}) => {
  const dispatch = useDispatch();
  const [activeKey, setActiveKey] = useState([]);

  const getForm = () => {
    let out = null;
    form.validateFields((err, values) => {
      if (!err) {
        const index = parameters.findIndex(
          (x) => x.type === 'ScenarioParameter',
        );
        let scenario = {};
        if (index >= 0) scenario = { scenario: parameters[index].value };
        out = {
          ...scenario,
          ...values,
        };
        console.log('Received values of form: ', out);
      } // Expand collapsed categories if errors are found inside
      else if (categoricalParameters) {
        let categoriesWithErrors = [];
        for (const parameterName in err) {
          for (const category in categoricalParameters) {
            if (
              typeof categoricalParameters[category].find(
                (x) => x.name === parameterName,
              ) !== 'undefined'
            ) {
              categoriesWithErrors.push(category);
              break;
            }
          }
        }
        categoriesWithErrors.length &&
          setActiveKey((oldValue) => oldValue.concat(categoriesWithErrors));
      }
    });
    return out;
  };

  const runScript = () => {
    const values = getForm();
    values && dispatch(createJob(script, values));
  };

  const saveParams = (params) => {
    params && dispatch(saveToolParams(script, params));
  };

  const setDefault = () => dispatch(setDefaultToolParams(script));

  let toolParams = null;
  if (parameters) {
    toolParams = parameters.map((param) => {
      if (param.type === 'ScenarioParameter') return null;
      return <Parameter key={param.name} form={form} parameter={param} />;
    });
  }

  let categoricalParams = null;
  if (categoricalParameters && Object.keys(categoricalParameters).length) {
    const categories = Object.keys(categoricalParameters).map((category) => ({
      key: category,
      label: category,
      children: categoricalParameters[category].map((param) => (
        <Parameter key={param.name} form={form} parameter={param} />
      )),
    }));
    categoricalParams = (
      <Collapse
        activeKey={activeKey}
        onChange={setActiveKey}
        items={categories}
      />
    );
  }

  return (
    <Form layout="horizontal" className="cea-tool-form">
      <Form.Item className="formButtons">
        <div className="cea-tool-form-buttongroup">
          <ToolFormButtons
            getForm={getForm}
            runScript={runScript}
            saveParams={saveParams}
            setDefault={setDefault}
            disabled={disableButtons}
          />
        </div>
      </Form.Item>
      <Divider />

      {toolParams}
      {categoricalParams}
      <br />
    </Form>
  );
});

const ToolFormButtons = ({
  getForm,
  runScript,
  saveParams,
  setDefault,
  disabled = false,
}) => {
  return (
    <>
      <Button type="primary" onClick={runScript} disabled={disabled}>
        Run Script
      </Button>
      <Button
        type="primary"
        onClick={() => {
          saveParams(getForm());
        }}
        disabled={disabled}
      >
        Save to Config
      </Button>
      <Button type="primary" onClick={setDefault} disabled={disabled}>
        Default
      </Button>
    </>
  );
};

const Spin = ({ children }) => {
  const { isSaving } = useSelector((state) => state.toolSaving);
  return <AntSpin spinning={isSaving}>{children}</AntSpin>;
};

export default Tool;
