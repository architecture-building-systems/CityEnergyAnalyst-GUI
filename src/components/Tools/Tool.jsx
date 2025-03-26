import {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Skeleton, Divider, Collapse, Button, Spin, Alert, Form } from 'antd';
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
import { ExternalLinkIcon, RunIcon } from '../../assets/icons';
import { useHoverGrow } from '../Project/Cards/OverviewCard/hooks';

import { animated } from '@react-spring/web';
import { apiClient } from '../../api/axios';
import { useSetShowLoginModal } from '../Login/store';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isElectron, openExternal } from '../../utils/electron';

const useCheckMissingInputs = (tool) => {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState();

  const fetch = async (parameters) => {
    setFetching(true);
    try {
      await apiClient.post(`/api/tools/${tool}/check`, parameters);
      setError(null);
    } catch (err) {
      setError(err.response.data?.detail?.script_suggestions);
    } finally {
      setFetching(false);
    }
  };

  // reset error when tool changes
  useEffect(() => {
    setError();
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

  // Checks have not been run, so ignore
  if (error == undefined) return null;

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

  const setShowLoginModal = useSetShowLoginModal();
  const handleLogin = () => {
    setShowLoginModal(true);
  };

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
      dispatch(createJob(script, params)).catch((err) => {
        if (err.response.status === 401) handleLogin();
        else console.log(`Error creating job: ${err}`);
      });
    });
  };

  const saveParams = () => {
    getForm((params) => {
      dispatch(saveToolParams(script, params))
        .then(() => {
          callbacks?.onSave?.(params);
        })
        .catch((err) => {
          if (err.response.status === 401) return;
          else console.log(`Error saving tool parameters: ${err}`);
        });
    });
  };

  const setDefault = () => {
    dispatch(setDefaultToolParams(script))
      .then(() => {
        form.resetFields();
        getForm((params) => {
          callbacks?.onReset?.(params);
        });
      })
      .catch((err) => {
        if (err.response.status === 401) return;
        else console.log(`Error setting default tool parameters: ${err}`);
      });
  };

  return { form, getForm, runScript, saveParams, setDefault };
};

const Tool = withErrorBoundary(({ script, onToolSelected, header }) => {
  const { status, error, params } = useSelector((state) => state.toolParams);
  const { isSaving } = useSelector((state) => state.toolSaving);

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

  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollPositionRef = useRef(0);

  const descriptionRef = useRef(null);
  const descriptionHeightRef = useRef('auto');

  // This effect will measure the actual height of the description
  useLayoutEffect(() => {
    if (descriptionRef.current) {
      const height = descriptionRef.current.scrollHeight;
      descriptionHeightRef.current = height;
    }
  }, [description, descriptionRef.current]);

  const handleScroll = useCallback((e) => {
    // Ensure the scroll threshold greater than the description height to prevent layout shifts
    const scrollThreshold = descriptionHeightRef.current;
    const currentScrollPosition = e.target.scrollTop;

    // Determine scroll direction and update header visibility
    if (
      currentScrollPosition > lastScrollPositionRef.current &&
      currentScrollPosition > scrollThreshold
    ) {
      setHeaderVisible(false); // Hide header when scrolling down past threshold
    } else if (currentScrollPosition == 0) {
      setHeaderVisible(true); // Show header when scrolling up or near top
    }
    lastScrollPositionRef.current = currentScrollPosition;
  }, []);

  const checkMissingInputs = (params) => {
    fetch?.(params);
  };

  const { form, getForm, runScript, saveParams, setDefault } = useToolForm(
    script,
    parameters,
    categoricalParameters,
    {
      onSave: checkMissingInputs, // Check inputs when saving to make sure they are valid if changed
      onReset: checkMissingInputs,
    },
  );

  const onMount = () => {
    getForm((params) => checkMissingInputs(params));
  };

  useEffect(() => {
    dispatch(fetchToolParams(script));
    // Reset header visibility when the component mounts
    setHeaderVisible(true);
    lastScrollPositionRef.current = 0;
    descriptionHeightRef.current = 'auto';

    return () => dispatch(resetToolParams());
  }, [script]);

  if (status == 'fetching')
    return (
      <div style={{ padding: 12 }}>
        {header}
        <Skeleton active />
        <div className="cea-tool-form-buttongroup">
          <Skeleton.Button active />
          <Skeleton.Button active />
          <Skeleton.Button active />
        </div>
        <Divider />
        <Skeleton active />
        <Skeleton active />
        <Skeleton active />
      </div>
    );
  if (status == 'failed')
    return (
      <div>
        {header}
        <AsyncError error={error} />
      </div>
    );
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
        <div
          id="cea-tool-header"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,

            paddingTop: 12,
            paddingInline: 12,
          }}
        >
          <div id="cea-tool-header-content">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {header}
              <small
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <span>{category}</span>
                {!headerVisible && <b>{label}</b>}
              </small>
            </div>
            <div
              id="cea-tool-header-description"
              ref={descriptionRef}
              style={{
                height: headerVisible ? `${descriptionHeightRef.current}px` : 0,
                opacity: headerVisible ? 1 : 0,
                overflow: 'hidden',
                transition:
                  'height 0.3s ease-in-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                transform: headerVisible
                  ? 'translateY(0)'
                  : 'translateY(-10px)',
                transformOrigin: 'top',
              }}
            >
              <div>
                <h2>{label}</h2>
                <small>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      a: ({ node, href, children, ...props }) => {
                        if (isElectron())
                          return (
                            <a {...props} onClick={() => openExternal(href)}>
                              {children}
                            </a>
                          );
                        else
                          return (
                            <a
                              {...props}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          );
                      },
                    }}
                  >
                    {description}
                  </ReactMarkdown>
                </small>
              </div>
            </div>
          </div>

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

        <Divider />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            paddingInline: 12,
          }}
          onScroll={handleScroll}
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
