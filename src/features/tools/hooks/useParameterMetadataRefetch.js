import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { getFormValues } from '../utils';
import { useCheckInputs } from '../stores/checkInputsStore';

const useParameterMetadataRefetch = (script, form) => {
  const queryClient = useQueryClient();
  const { checkInputs } = useCheckInputs();
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

        const { parameters: updatedMetadata } = response.data;
        console.log(
          `[handleRefetch] Received metadata for ${Object.keys(updatedMetadata).length} parameters`,
        );

        // Update React Query cache with new parameter metadata
        queryClient.setQueryData(['toolParams', script], (oldData) => {
          if (!oldData) return oldData;

          const newParameters = [...(oldData.parameters || [])];
          const newCategoricalParameters = {
            ...(oldData.categorical_parameters || {}),
          };

          // Update parameters
          Object.keys(updatedMetadata).forEach((paramName) => {
            const metadata = updatedMetadata[paramName];

            // Find in regular parameters
            const paramIndex = newParameters.findIndex(
              (p) => p.name === paramName,
            );
            if (paramIndex >= 0) {
              newParameters[paramIndex] = {
                ...newParameters[paramIndex],
                ...metadata,
              };
            }

            // Find in categorical parameters
            Object.keys(newCategoricalParameters).forEach((category) => {
              const catParamIndex = newCategoricalParameters[
                category
              ].findIndex((p) => p.name === paramName);
              if (catParamIndex >= 0) {
                const cloned = [...newCategoricalParameters[category]];
                cloned[catParamIndex] = {
                  ...cloned[catParamIndex],
                  ...metadata,
                };
                newCategoricalParameters[category] = cloned;
              }
            });
          });

          return {
            ...oldData,
            parameters: newParameters,
            categorical_parameters: newCategoricalParameters,
          };
        });

        // Update form values for affected parameters if value changed
        Object.keys(updatedMetadata).forEach((paramName) => {
          const metadata = updatedMetadata[paramName];
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
        const updatedCache = queryClient.getQueryData(['toolParams', script]);
        const currentParams = await getFormValues(
          form,
          updatedCache?.parameters,
          updatedCache?.categorical_parameters,
        );
        if (currentParams) {
          console.log('[handleRefetch] Re-checking for missing inputs');
          checkInputs(script, currentParams);
        }
      } catch (err) {
        console.error('Error refetching parameter metadata:', err);
      } finally {
        setIsRefetching(false);
      }
    },
    [script, form, queryClient, checkInputs, setIsRefetching],
  );

  return { handleRefetch, isRefetching };
};

export default useParameterMetadataRefetch;
