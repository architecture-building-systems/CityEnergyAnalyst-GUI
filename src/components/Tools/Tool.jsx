import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Skeleton,
  Divider,
  Collapse,
  Button,
  Spin,
  Alert,
  message,
  Form,
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
import { ExternalLinkIcon, RunIcon } from '../../assets/icons';
import { useHoverGrow } from '../Project/Cards/OverviewCard/hooks';

import { animated } from '@react-spring/web';

const useCheckMissingInputs = (tool) => {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState([]);

  const fetch = async (parameters) => {
    setFetching(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_CEA_URL}/api/tools/${tool}/check`,
        parameters,
      );
      setError(null);
    } catch (err) {
      setError(err.response.data?.detail?.script_suggestions);
    } finally {
      setFetching(false);
    }
  };

  // reset error when tool changes
  useEffect(() => {
    setError([]);
  }, [tool]);

  return { fetch, fetching, error };
};

const ScriptSuggestions = ({ onToolSelected, fetching, error }) => {
  if (fetching)
    return (
      <div style={{ fontFamily: 'monospace' }}>
        Checking for missing inputs...
      </div>
    );
  if (error?.length)
    return (
      <Alert
        message="Missing inputs detected"
        description={
          <div>
            <p>Run the following scripts to create the missing inputs:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {error.map(({ label, name }) => {
                return (
                  <div key={name} style={{ display: 'flex', gap: 8 }}>
                    -
                    <b
                      className="cea-tool-suggestions"
                      onClick={() => onToolSelected?.(name)}
                      style={{ marginRight: 'auto' }}
                      aria-hidden
                    >
                      {label}
                      <ExternalLinkIcon style={{ fontSize: 18 }} />
                    </b>
                  </div>
                );
              })}
            </div>
          </div>
        }
        type="info"
        showIcon
      />
    );

  // Error should be null if there is no error
  if (error !== null) {
    return (
      <Alert
        message="Error"
        description="Something went wrong while checking for missing inputs."
        type="error"
        showIcon
      />
    );
  }
  return null;
};

const useToolForm = (
  script,
  parameters,
  categoricalParameters,
  callbacks = {
    onSave: null,
    onReset: null,
  },
) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  // TODO: Add error callback
  const getForm = async (callback) => {
    let out = null;
    if (!parameters) return out;

    try {
      const values = await form.validateFields();

      // Add scenario information to the form
      const index = parameters.findIndex((x) => x.type === 'ScenarioParameter');
      let scenario = {};
      if (index >= 0) scenario = { scenario: parameters[index].value };

      out = {
        ...scenario,
        ...values,
      };
      console.log('Received values of form: ', out);
      callback?.(out);
    } catch (err) {
      console.log('Error', err);
      // Expand collapsed categories if errors are found inside
      if (categoricalParameters) {
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
        // FIXME: show errors in categories
        // categoriesWithErrors.length &&
        //   setActiveKey((oldValue) => oldValue.concat(categoriesWithErrors));
      }
    }
  };

  const runScript = () => {
    getForm((params) => {
      dispatch(createJob(script, params));
    });
  };

  const saveParams = () => {
    getForm((params) => {
      dispatch(saveToolParams(script, params)).then(() => {
        callbacks?.onSave?.(params);
      });
    });
  };

  const setDefault = () => {
    dispatch(setDefaultToolParams(script)).then(() => {
      getForm((params) => {
        callbacks?.onReset?.(params);
      });
    });
  };

  return { form, getForm, runScript, saveParams, setDefault };
};

const Tool = withErrorBoundary(({ script, onToolSelected }) => {
  const { status, error, params } = useSelector((state) => state.toolParams);
  const { isSaving, error: savingError } = useSelector(
    (state) => state.toolSaving,
  );

  const dispatch = useDispatch();
  const {
    category,
    label,
    description,
    parameters,
    categorical_parameters: categoricalParameters,
  } = params;

  const { fetch, fetching, error: _error } = useCheckMissingInputs(script);
  const disableButtons = fetching || _error !== null;

  const checkMissingInputs = (params) => {
    fetch?.(params);
  };

  const { form, getForm, runScript, saveParams, setDefault } = useToolForm(
    script,
    parameters,
    categoricalParameters,
    {
      onSave: checkMissingInputs,
      onReset: checkMissingInputs,
    },
  );

  const onMount = () => {
    getForm((params) => checkMissingInputs(params));
  };

  useEffect(() => {
    if (savingError) {
      message.config({
        top: 120,
      });
      console.error(savingError);
      message.error(savingError?.message ?? 'Something went wrong.');
    }
  }, [savingError]);

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
    <Spin wrapperClassName="cea-tool-form-spinner" spinning={isSaving}>
      <div
        style={{
          // position: 'relative', // Add this to ensure proper spin overlay
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div>
          <h3>{category}</h3>
          <h2 style={{ display: 'inline' }}>{label}</h2>
          <p>
            <small style={{ whiteSpace: 'pre-line' }}>{description}</small>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="cea-tool-form-buttongroup">
              <ToolFormButtons
                runScript={runScript}
                saveParams={saveParams}
                setDefault={setDefault}
                disabled={disableButtons}
              />
            </div>

            <ScriptSuggestions
              onToolSelected={onToolSelected}
              fetching={fetching}
              error={_error}
            />
          </div>
        </div>

        <Divider />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            paddingInline: 12,
          }}
        >
          <ToolForm
            form={form}
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            disableButtons={disableButtons}
            onMount={onMount}
          />
        </div>
      </div>
    </Spin>
  );
});

const ToolForm = ({ form, parameters, categoricalParameters, onMount }) => {
  const [activeKey, setActiveKey] = useState([]);

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

  useEffect(() => {
    onMount?.();
  }, []);

  return (
    <Form form={form} layout="vertical" className="cea-tool-form">
      {toolParams}
      {categoricalParams}
    </Form>
  );
};

const ToolFormButtons = ({
  runScript,
  saveParams,
  setDefault,
  disabled = false,
}) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  return (
    <>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={disabled ? null : styles}
      >
        <Button type="primary" onClick={runScript} disabled={disabled}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Run
            <RunIcon style={{ fontSize: 18 }} />
          </div>
        </Button>
      </animated.div>

      <Button onClick={saveParams}>Save Settings</Button>
      <Button onClick={setDefault}>Reset</Button>
    </>
  );
};

export default Tool;
