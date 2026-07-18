import { useCallback, useEffect, useState } from 'react';
import { useCheckInputsMutation } from './mutations';
import { getFormValues } from '../utils';

/**
 * Validates tool inputs and manages validation errors.
 * Triggers validation whenever parameters or form data changes.
 */
const useInputValidation = (
  script,
  parameters,
  categoricalParameters,
  form,
  onError,
  dataUpdatedAt,
  scenarioOverride = null,
) => {
  const [inputError, setInputError] = useState(undefined);
  const { mutateAsync: checkInputs } = useCheckInputsMutation(scenarioOverride);

  const runCheck = useCallback(
    async (cancelled = { value: false }) => {
      if (!script || !parameters) return;

      setInputError(undefined);

      const formParams = await getFormValues(
        form,
        parameters,
        categoricalParameters,
        onError,
      );

      try {
        if (!cancelled.value && formParams) {
          await checkInputs({ tool: script, parameters: formParams });
          if (!cancelled.value) setInputError(null);
        }
      } catch (err) {
        if (!cancelled.value) {
          const message =
            err.response?.data?.detail ||
            err.response?.statusText ||
            err.message ||
            'Unexpected error';
          setInputError(message);
        }
      }
    },
    [script, form, parameters, categoricalParameters, checkInputs, onError],
  );

  // Check inputs whenever parameters change, i.e. save, reset, or refetch
  useEffect(() => {
    const cancelled = { value: false };
    queueMicrotask(() => runCheck(cancelled));
    return () => {
      cancelled.value = true;
    };
  }, [runCheck, dataUpdatedAt]);

  const recheckInputs = useCallback(() => {
    runCheck({ value: false });
  }, [runCheck]);

  return { inputError, recheckInputs };
};

export default useInputValidation;
