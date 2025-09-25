import {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import { Divider, Spin, Alert, Form } from 'antd';
import useToolsStore from 'features/tools/stores/toolsStore';
import useJobsStore from 'features/jobs/stores/jobsStore';
import { AsyncError } from 'components/AsyncError';

import './Tool.css';
import { ExternalLinkIcon } from 'assets/icons';

import { apiClient } from 'lib/api/axios';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';

import ToolForm, { ToolFormButtons } from './ToolForm';
import { ToolDescription } from 'features/tools/components/tool-description';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import { ToolSkeleton } from '../tool-skeleton';

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
  externalForm = null,
) => {
  const [form] = Form.useForm(externalForm);
  const { saveToolParams, setDefaultToolParams } = useToolsStore();
  const { createJob } = useJobsStore();

  const setShowLoginModal = useSetShowLoginModal();
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  // TODO: Add error callback
  const getForm = async () => {
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

      return out;
    } catch (err) {
      // Ignore out of date error
      if (err?.outOfDate) return;

      console.error('Error', err);
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

  const runScript = async () => {
    const params = await getForm();

    return createJob(script, params).catch((err) => {
      if (err.response.status === 401) handleLogin();
      else console.error(`Error creating job: ${err}`);
    });
  };

  const saveParams = async () => {
    const params = await getForm();

    return saveToolParams(script, params)
      .then(() => {
        return callbacks?.onSave?.(params);
      })
      .catch((err) => {
        if (err.response.status === 401) return;
        else console.error(`Error saving tool parameters: ${err}`);
      });
  };

  const setDefault = async () => {
    return setDefaultToolParams(script)
      .then(() => {
        form.resetFields();
        return getForm();
      })
      .then((params) => {
        return callbacks?.onReset?.(params);
      })
      .catch((err) => {
        if (err.response.status === 401) return;
        else console.error(`Error setting default tool parameters: ${err}`);
      });
  };

  return { form, getForm, runScript, saveParams, setDefault };
};

const Tool = ({ script, onToolSelected, header, form: externalForm }) => {
  const { status, error, params } = useToolsStore((state) => state.toolParams);
  const { isSaving } = useToolsStore((state) => state.toolSaving);
  const { fetchToolParams, resetToolParams } = useToolsStore();

  const changes = useChangesExist();

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
  const [showSkeleton, setShowSkeleton] = useState(true);
  const lastScrollPositionRef = useRef(0);

  const descriptionRef = useRef(null);
  const descriptionHeightRef = useRef('auto');

  // Hide skeleton after grid transition completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 350); // 50ms buffer after 300ms transition

    return () => clearTimeout(timer);
  }, []);

  // This effect will measure the actual height of the description
  useLayoutEffect(() => {
    if (descriptionRef.current && !showSkeleton) {
      const height = descriptionRef.current.scrollHeight;
      descriptionHeightRef.current = height;
    }
  }, [description, showSkeleton]);

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
    externalForm,
  );

  const onMount = async () => {
    const params = await getForm();
    if (params) checkMissingInputs(params);
  };

  useEffect(() => {
    form.resetFields();
    fetchToolParams(script);
    // Reset header visibility when the component mounts
    setHeaderVisible(true);
    lastScrollPositionRef.current = 0;
    descriptionHeightRef.current = 'auto';

    return async () => {
      await resetToolParams();
    };
  }, [script, fetchToolParams, resetToolParams, form]);

  if (status == 'fetching' || showSkeleton)
    return (
      <div style={{ padding: 12 }}>
        {header}
        <ToolSkeleton loadingText="Loading parameters..." />
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

                  marginLeft: 'auto',
                }}
              >
                <span>{category}</span>
                {!headerVisible && <b>{label}</b>}
              </small>
            </div>
            <ToolDescription
              ref={descriptionRef}
              description={description}
              height={descriptionHeightRef.current}
              label={label}
              visible={headerVisible}
            />
          </div>

          <div className="cea-tool-form-buttongroup">
            <ToolFormButtons
              runScript={runScript}
              saveParams={saveParams}
              setDefault={setDefault}
              disabled={disableButtons}
            />
          </div>

          {changes && (
            <Alert
              message={
                <>
                  Unsaved changes detected. <br />
                  Save or discard before proceeding.
                </>
              }
              type="warning"
              showIcon
            />
          )}

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
};

export default Tool;
