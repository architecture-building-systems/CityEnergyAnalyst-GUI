import { useState } from 'react';
import { Button } from 'antd';
import { animated } from '@react-spring/web';

import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { RunIcon } from 'assets/icons';
import { getFormValues } from 'features/tools/utils';
import {
  useCheckMissingInputs,
  useSaveToolParams,
  useSetDefaultToolParams,
} from 'features/tools/stores/toolsStore';
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

  const saveToolParams = useSaveToolParams();
  const checkingInputs = useCheckMissingInputs();
  const setDefaultToolParams = useSetDefaultToolParams();
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

    // If getForm() returns null/undefined (validation failed), don't save
    if (!params) {
      console.error('Cannot save - form validation failed');
      return;
    }

    try {
      await saveToolParams(script, params);
      await checkingInputs(script, params);
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
      else console.error(`Error saving tool parameters: ${err}`);
    }
  };

  const setDefault = async () => {
    try {
      await setDefaultToolParams(script);
      form.resetFields();

      const params = await getFormValues(
        form,
        parameters,
        categoricalParameters,
      );
      if (params) await checkingInputs(script, params);
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
      else console.error(`Error setting default tool parameters: ${err}`);
    }
  };

  const handleRunScript = async () => {
    setLoading(true);
    try {
      await runScript?.();
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

      <Button onClick={saveParams}>Save Settings</Button>
      <Button onClick={setDefault}>Reset</Button>
    </>
  );
};
