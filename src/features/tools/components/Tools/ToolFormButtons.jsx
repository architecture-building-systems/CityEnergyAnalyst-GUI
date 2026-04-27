import { useState } from 'react';
import { Button, Modal } from 'antd';
import { animated } from '@react-spring/web';

import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { RunIcon } from 'assets/icons';
import { apiClient } from 'lib/api/axios';
import { getFormValues } from 'features/tools/utils';
import {
  useSetDefaultToolParamsMutation,
  useSaveToolParamsMutation,
} from 'features/tools/hooks/mutations';
import { useCreateJob } from 'features/jobs/stores/jobsStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';

const COLLISION_FIELDS = {
  'network-layout': 'network-name',
  'final-energy': 'what-if-name',
};

export const ToolFormButtons = ({
  form,
  parameters,
  categoricalParameters,
  script,
  disabled = false,
  setError,
  onValidationError,
  // Optional Run handler. When provided, Run calls this with validated
  // form values instead of creating a job. Save Settings / Reset are
  // hidden because they wire to the tool-params backend, not the
  // embedding flow. Used by the canvas to commit a plot config to a slot.
  onRunOverride,
}) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  const [loading, setLoading] = useState(false);

  const { mutateAsync: setDefaultToolParams, isPending: isResetting } =
    useSetDefaultToolParamsMutation();
  const { mutateAsync: saveToolParams, isPending: isSaving } =
    useSaveToolParamsMutation();
  const createJob = useCreateJob();

  const setShowLoginModal = useSetShowLoginModal();
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const runScript = async () => {
    setError?.(null);
    const params = await getFormValues(
      form,
      parameters,
      categoricalParameters,
      onValidationError,
    );

    if (!params) {
      console.error('Cannot run - form validation failed');
      return;
    }

    // Embedding flow (e.g. Canvas Builder): caller owns the Run behaviour.
    if (onRunOverride) {
      try {
        await onRunOverride(params);
      } catch (err) {
        setError?.(err?.message || 'An error occurred while running.');
      }
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
    setError?.(null);
    const params = await getFormValues(
      form,
      parameters,
      categoricalParameters,
      onValidationError,
    );

    if (!params) return;

    try {
      await saveToolParams({ tool: script, params });
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
      else {
        console.error('Error saving params:', err);
        setError?.(
          err.response?.data?.detail ||
            'An error occurred while saving parameters.',
        );
      }
    }
  };

  const setDefault = async () => {
    setError?.(null);
    try {
      await setDefaultToolParams(script);
    } catch (err) {
      if (err?.response?.status === 401) handleLogin();
      else {
        console.error('Error resetting defaults:', err);
        setError?.(
          err.response?.data?.detail ||
            'An error occurred while resetting to default parameters.',
        );
      }
    }
  };

  const doRun = async () => {
    setLoading(true);
    try {
      await runScript();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScript = async () => {
    const fieldName = COLLISION_FIELDS[script];
    if (fieldName) {
      const formValues = form.getFieldsValue();
      const value = formValues[fieldName];
      if (value) {
        try {
          const resp = await apiClient.post(
            `/api/tools/${script}/validate-field`,
            {
              parameter_name: fieldName,
              value,
              form_values: formValues,
            },
          );
          const warnings = resp.data?.warnings ?? [];
          if (warnings.length > 0) {
            const messages = warnings.map((w) => w.message ?? w);
            Modal.confirm({
              title: 'Overwrite existing results?',
              content: messages.join('\n'),
              okText: 'Continue',
              cancelText: 'Cancel',
              onOk: doRun,
            });
            return;
          }
        } catch {
          // Validation error — doRun will catch it via form validation
        }
      }
    }
    doRun();
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
      <Button onClick={setDefault} loading={isResetting}>
        Reset
      </Button>
    </>
  );
};
