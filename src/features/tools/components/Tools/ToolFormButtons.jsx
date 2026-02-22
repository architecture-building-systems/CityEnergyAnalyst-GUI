import { useState } from 'react';
import { Button } from 'antd';
import { animated } from '@react-spring/web';

import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { RunIcon } from 'assets/icons';
import { getFormValues } from 'features/tools/utils';
import {
  useSetDefaultToolParamsMutation,
  useCheckInputsMutation,
  useSaveToolParamsMutation,
} from 'features/tools/hooks/mutations';
import { useCreateJob } from 'features/jobs/stores/jobsStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';

export const ToolFormButtons = ({
  form,
  parameters,
  categoricalParameters,
  script,
  disabled = false,
}) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  const [loading, setLoading] = useState(false);

  const { mutateAsync: checkInputs } = useCheckInputsMutation();
  const { mutateAsync: setDefaultToolParams } =
    useSetDefaultToolParamsMutation();
  const { mutateAsync: saveToolParams, isPending: isSaving } =
    useSaveToolParamsMutation();
  const createJob = useCreateJob();

  const setShowLoginModal = useSetShowLoginModal();
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const runScript = async () => {
    const params = await getFormValues(form, parameters, categoricalParameters);

    // If getForm() returns null/undefined (validation failed), don't run
    if (!params) {
      console.error('Cannot run - form validation failed');
      return;
    }

    try {
      const result = await createJob(script, params);
      return result;
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
      else console.error(`Error creating job: ${err}`);
    }
  };

  const saveParams = async () => {
    const params = await getFormValues(form, parameters, categoricalParameters);

    if (!params) {
      return;
    }

    try {
      await saveToolParams({ tool: script, params });
      await checkInputs({ tool: script, parameters: params });
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
    }
  };

  const setDefault = async () => {
    try {
      await setDefaultToolParams(script);
      form.resetFields();
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
    }
  };

  const handleRunScript = async () => {
    setLoading(true);
    try {
      await runScript();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <animated.div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={disabled || loading ? null : styles}
      >
        <Button
          type="primary"
          onClick={handleRunScript}
          disabled={disabled}
          loading={loading}
        >
          {loading ? (
            <div>Starting job...</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Run
              <RunIcon style={{ fontSize: 18 }} />
            </div>
          )}
        </Button>
      </animated.div>

      <Button onClick={saveParams} loading={isSaving}>
        Save Settings
      </Button>
      <Button onClick={setDefault}>Reset</Button>
    </>
  );
};
