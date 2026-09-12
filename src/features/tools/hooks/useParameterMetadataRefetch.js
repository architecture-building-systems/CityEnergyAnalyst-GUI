import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { childScenarioToken, scenarioHeaders } from 'lib/api/scenarioContext';
import { TOOLS_QUERY_KEYS, TOOLS_MUTATION_KEYS } from '../constants/queryKeys';

// `scenarioContext` must be the same `{ project, scenarioName, childScenario }` the
// caller's useToolParams was fetched with (Tool.jsx resolves it from either
// scenarioOverride or the active scenario) -- it picks both the request headers AND the
// cache entry the response is written back into. Reading the active scenario from the
// store here instead would send the wrong headers and write into the wrong cache entry
// whenever the caller is a scenarioOverride column (e.g. a Canvas Builder pathway-state
// column), which does not track the active scenario.
const useParameterMetadataRefetch = (script, form, scenarioContext) => {
  const queryClient = useQueryClient();
  const { project, scenarioName, childScenario } = scenarioContext;

  return useMutation({
    mutationKey: [TOOLS_MUTATION_KEYS.REFETCH_PARAMETER_METADATA],
    mutationFn: async ({ formValues, affectedParams }) => {
      let response;
      try {
        response = await getScenarioClient().post(
          `/tools/${script}/parameter-metadata`,
          {
            form_values: formValues,
            affected_parameters: affectedParams,
          },
          {
            headers: scenarioHeaders({ project, scenarioName, childScenario }),
          },
        );
      } catch (err) {
        const error = new Error(err.message);
        error.response = {
          status: err.response?.status,
          data: err.response?.data,
          statusText: err.response?.statusText,
        };
        throw error;
      }

      const { parameters: updatedMetadata } = response.data;

      // Update cache.
      //
      // The key must mirror useToolParams' key exactly — it is scoped by
      // scenario context, so a bare [TOOL_PARAMS, script] matches nothing
      // and the refreshed `choices` get silently discarded while the new
      // values still land on the form, leaving a dropdown whose value its
      // own stale choices reject. Scoping it (rather than prefix-matching
      // every scenario) keeps this scenario's metadata out of the others'
      // cache entries.
      queryClient.setQueryData(
        [
          TOOLS_QUERY_KEYS.TOOL_PARAMS,
          script,
          project,
          scenarioName,
          childScenarioToken(childScenario),
        ],
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

      // Update form values
      Object.keys(updatedMetadata).forEach((paramName) => {
        const metadata = updatedMetadata[paramName];
        if (metadata.value !== undefined) {
          const currentValue = form.getFieldValue(paramName);
          if (currentValue !== metadata.value) {
            form.setFieldValue(paramName, metadata.value);
          }
        }
      });
    },
    onError: (err) => {
      console.error('Error refetching parameter metadata:', err);
    },
  });
};

export default useParameterMetadataRefetch;
