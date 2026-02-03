import { useCallback } from 'react';
import { Form } from 'antd';
import useToolsStore from 'features/tools/stores/toolsStore';
import useJobsStore from 'features/jobs/stores/jobsStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';

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
  const saveToolParams = useToolsStore((state) => state.saveToolParams);
  const setDefaultToolParams = useToolsStore(
    (state) => state.setDefaultToolParams,
  );
  const { createJob } = useJobsStore();

  const setShowLoginModal = useSetShowLoginModal();
  const handleLogin = () => {
    setShowLoginModal(true);
  };

  // TODO: Add error callback
  const getForm = useCallback(async () => {
    let out = null;
    if (!parameters) return out;

    try {
      const values = await form.validateFields();

      // Add scenario information to the form
      const index = parameters.findIndex((x) => x.type === 'ScenarioParameter');
      let scenario = {};
      if (index >= 0) scenario = { scenario: parameters[index].value };

      // Convert undefined/null values to empty strings for nullable parameters
      // This ensures backend receives "" instead of undefined/null
      const cleanedValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          key,
          value === undefined || value === null ? '' : value,
        ]),
      );

      out = {
        ...scenario,
        ...cleanedValues,
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
  }, [form, parameters, categoricalParameters]);

  const runScript = async () => {
    const params = await getForm();

    // If getForm() returns null/undefined (validation failed), don't run
    if (!params) {
      console.error('Cannot run - form validation failed');
      return;
    }

    return createJob(script, params)
      .then((result) => {
        // Clear network-name field after successful job creation to prevent duplicate runs
        if (script === 'network-layout' && params?.['network-name']) {
          form.setFieldsValue({ 'network-name': '' });
          // Don't call validateFields - the component will detect the change and clear validation state
        }
        return result;
      })
      .catch((err) => {
        if (err?.response?.status === 401) handleLogin();
        else console.error(`Error creating job: ${err}`);
      });
  };

  const saveParams = async () => {
    const params = await getForm();

    // If getForm() returns null/undefined (validation failed), don't save
    if (!params) {
      console.error('Cannot save - form validation failed');
      return;
    }

    return saveToolParams(script, params)
      .then(() => {
        return callbacks?.onSave?.(params);
      })
      .catch((err) => {
        if (err?.response?.status === 401) return;
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
        if (err?.response?.status === 401) return;
        else console.error(`Error setting default tool parameters: ${err}`);
      });
  };

  return { form, getForm, runScript, saveParams, setDefault };
};

export default useToolForm;
