import { useState } from 'react';
import { Button } from 'antd';
import { animated } from '@react-spring/web';

import { useHoverGrow } from 'features/project/hooks/hover-grow';

import { RunIcon } from 'assets/icons';
import { getFormValues } from 'features/tools/utils';
import {
  useSetDefaultToolParamsMutation,
  useSaveToolParamsMutation,
} from 'features/tools/hooks/mutations';
import { useCreateJob } from 'features/jobs/stores/jobsStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';
import { useToolFormStore } from '../../stores/tool-form-store';

export const ToolFormButtons = ({
  form,
  parameters,
  categoricalParameters,
  script,
  disabled = false,
  setError,
}) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  const [loading, setLoading] = useState(false);
  const expandCategories = useToolFormStore((state) => state.expandCategories);

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
      (_err, categoriesToExpand) => {
        if (categoriesToExpand.length > 0) {
          expandCategories(categoriesToExpand);
        }
        setError?.('Please fix validation errors before running the tool.');
      },
    );

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
    setError?.(null);
    const params = await getFormValues(
      form,
      parameters,
      categoricalParameters,
      (_err, categoriesToExpand) => {
        if (categoriesToExpand.length > 0) {
          expandCategories(categoriesToExpand);
        }
        setError?.('Save Failed: Check errors in form.');
      },
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
      <Button onClick={setDefault} loading={isResetting}>
        Reset
      </Button>
    </>
  );
};
