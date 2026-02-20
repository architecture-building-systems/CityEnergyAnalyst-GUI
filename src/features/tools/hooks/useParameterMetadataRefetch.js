import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';
import { getFormValues } from '../utils';
import { useCheckInputsMutation } from './mutations';
import { TOOLS_QUERY_KEYS } from '../constants/queryKeys';

const useParameterMetadataRefetch = (script, form) => {
  const queryClient = useQueryClient();
  const { mutate: checkInputs } = useCheckInputsMutation();
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefetch = useCallback(
    async (formValues, changedParam, affectedParams) => {
      try {
        setIsRefetching(true);

        const response = await apiClient.post(
          `/api/tools/${script}/parameter-metadata`,
          {
            form_values: formValues,
            affected_parameters: affectedParams,
          },
        );

        const { parameters: updatedMetadata } = response.data;

        queryClient.setQueryData(
          [TOOLS_QUERY_KEYS.TOOL_PARAMS, script],
          (oldData) => {
            if (!oldData) return oldData;

            const newParameters = [...(oldData.parameters || [])];
            const newCategoricalParameters = {
              ...(oldData.categorical_parameters || {}),
            };

            Object.keys(updatedMetadata).forEach((paramName) => {
              const metadata = updatedMetadata[paramName];

              const paramIndex = newParameters.findIndex(
                (p) => p.name === paramName,
              );
              if (paramIndex >= 0) {
                newParameters[paramIndex] = {
                  ...newParameters[paramIndex],
                  ...metadata,
                };
              }

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
          },
        );

        Object.keys(updatedMetadata).forEach((paramName) => {
          const metadata = updatedMetadata[paramName];
          if (metadata.value !== undefined) {
            const currentValue = form.getFieldValue(paramName);
            if (currentValue !== metadata.value) {
              form.setFieldValue(paramName, metadata.value);
            }
          }
        });

        const updatedCache = queryClient.getQueryData([
          TOOLS_QUERY_KEYS.TOOL_PARAMS,
          script,
        ]);
        const currentParams = await getFormValues(
          form,
          updatedCache?.parameters,
          updatedCache?.categorical_parameters,
        );
        if (currentParams) {
          checkInputs({ tool: script, parameters: currentParams });
        }
      } catch (err) {
        console.error('Error refetching parameter metadata:', err);
      } finally {
        setIsRefetching(false);
      }
    },
    [script, form, queryClient, checkInputs],
  );

  return { handleRefetch, isRefetching };
};

export default useParameterMetadataRefetch;
