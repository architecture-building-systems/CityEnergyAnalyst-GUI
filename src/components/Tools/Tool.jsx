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
import { ExternalLinkIcon, RunIcon } from '../../assets/icons';
import { useHoverGrow } from '../Project/Cards/OverviewCard/hooks';

import { animated } from '@react-spring/web';

export const ToolRoute = ({ match }) => {
  return <Tool script={match.params.script} />;
};

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
  if (error)
    return (
      <Alert
        message="Missing inputs detected"
        description={
          <div>
            <p>Run the following scripts to create the missing inputs:</p>
            {error?.length ? (
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

const Tool = withErrorBoundary(({ script, onToolSelected }) => {
  const { status, error, params } = useSelector((state) => state.toolParams);
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
            onToolSelected={onToolSelected}
            fetching={fetching}
            error={_error}
          />

          <ToolForm
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            disableButtons={disableButtons}
            onSave={checkMissingInputs}
            onMount={checkMissingInputs}
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
  onSave,
  onReset,
  onMount,
}) => {
  const dispatch = useDispatch();
  const [activeKey, setActiveKey] = useState([]);

  // TODO: Add error callback
  const getForm = (callback) => {
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
        callback?.(out);
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

  useEffect(() => {
    getForm((params) => {
      onMount?.(params);
    });
  }, []);

  const runScript = () => {
    getForm((params) => {
      dispatch(createJob(script, params));
    });
  };

  const saveParams = () => {
    getForm((params) => {
      dispatch(saveToolParams(script, params)).then(() => {
        onSave?.(params);
      });
    });
  };

  const setDefault = () => {
    dispatch(setDefaultToolParams(script)).then(() => {
      getForm((params) => {
        onReset?.(params);
      });
    });
  };

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
      <div
        style={{
          postion: 'absolute',
          height: '100%',
          width: '100%',
          background: '#fff',
        }}
      />
      <Form.Item className="formButtons">
        <div className="cea-tool-form-buttongroup">
          <ToolFormButtons
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

const Spin = ({ children }) => {
  const { isSaving } = useSelector((state) => state.toolSaving);
  return <AntSpin spinning={isSaving}>{children}</AntSpin>;
};

export default Tool;
