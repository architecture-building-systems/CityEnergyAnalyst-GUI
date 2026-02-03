import { useState, useCallback } from 'react';
import { apiClient } from 'lib/api/axios';

const useParameterMetadataRefetch = (
  script,
  form,
  getForm,
  checkMissingInputs,
  updateParameterMetadata,
) => {
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefetch = useCallback(
    async (formValues, changedParam, affectedParams) => {
      try {
        setIsRefetching(true);
        console.log(
          `[handleRefetch] Refetching metadata - changed: ${changedParam}, affected: ${affectedParams?.join(', ')}`,
        );

        // Call API to get updated parameter metadata
        const response = await apiClient.post(
          `/api/tools/${script}/parameter-metadata`,
          {
            form_values: formValues,
            affected_parameters: affectedParams,
          },
        );

        const { parameters } = response.data;
        console.log(
          `[handleRefetch] Received metadata for ${Object.keys(parameters).length} parameters`,
        );

        // Update parameter definitions in store
        updateParameterMetadata(parameters);

        // Update form values for affected parameters if value changed
        Object.keys(parameters).forEach((paramName) => {
          const metadata = parameters[paramName];
          if (metadata.value !== undefined) {
            const currentValue = form.getFieldValue(paramName);
            if (currentValue !== metadata.value) {
              console.log(
                `[handleRefetch] Updating ${paramName} value: ${currentValue} -> ${metadata.value}`,
              );
              form.setFieldValue(paramName, metadata.value);
            }
          }
        });

        // Re-check for missing inputs after metadata update
        // Parameters may now depend on different input files
        const currentParams = await getForm();
        if (currentParams) {
          console.log('[handleRefetch] Re-checking for missing inputs');
          checkMissingInputs(currentParams);
        }
      } catch (err) {
        console.error('Error refetching parameter metadata:', err);
      } finally {
        setIsRefetching(false);
      }
    },
    [script, form, updateParameterMetadata, getForm, checkMissingInputs],
  );

  return { handleRefetch, isRefetching };
};

export default useParameterMetadataRefetch;
