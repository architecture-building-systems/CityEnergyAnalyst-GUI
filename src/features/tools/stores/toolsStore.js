import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';

const useToolsStore = create((set, get) => ({
  // Tool List State
  toolList: {
    status: '',
    error: null,
    tools: {},
  },

  // Tool Parameters State
  toolParams: {
    status: '',
    error: null,
    params: {},
  },

  // Tool Saving State
  toolSaving: {
    isSaving: false,
  },

  // Missing Inputs State
  missingInputs: {
    checking: false,
    error: undefined, // undefined means have not checked yet, null means no error
  },

  // Actions
  fetchToolList: async () => {
    const { toolList } = get();

    // Don't fetch if already have tools
    if (Object.keys(toolList.tools).length > 0) {
      return;
    }

    set((state) => ({
      toolList: { ...state.toolList, status: 'fetching', error: null },
    }));

    try {
      const response = await apiClient.get('/api/tools/');
      set((state) => ({
        toolList: {
          ...state.toolList,
          tools: response.data,
          status: 'received',
        },
      }));
    } catch (error) {
      set((state) => ({
        toolList: {
          ...state.toolList,
          status: 'failed',
          error: error?.response,
        },
      }));
    }
  },

  fetchToolParams: async (tool) => {
    set((state) => ({
      toolParams: {
        ...state.toolParams,
        status: 'fetching',
        error: null,
        params: {},
      },
    }));

    try {
      const response = await apiClient.get(`/api/tools/${tool}`);
      set((state) => ({
        toolParams: {
          ...state.toolParams,
          params: response.data,
          status: 'received',
        },
      }));
    } catch (error) {
      set((state) => ({
        toolParams: {
          ...state.toolParams,
          status: 'failed',
          error: error?.response,
        },
      }));
    }
  },

  resetToolParams: () => {
    set({
      toolParams: { status: '', error: null, params: {} },
    });
  },

  saveToolParams: async (tool, params) => {
    set((state) => ({
      toolSaving: { ...state.toolSaving, isSaving: true },
    }));

    try {
      const response = await apiClient.post(
        `/api/tools/${tool}/save-config`,
        params,
      );
      return response.data;
    } finally {
      set((state) => ({
        toolSaving: { ...state.toolSaving, isSaving: false },
      }));
    }
  },

  updateParameterMetadata: (updatedMetadata) => {
    set((state) => {
      const currentParams = state.toolParams.params;
      const newParameters = [...(currentParams.parameters || [])];
      const newCategoricalParameters = {
        ...(currentParams.categoricalParameters || {}),
      };

      // Update parameters
      Object.keys(updatedMetadata).forEach((paramName) => {
        const metadata = updatedMetadata[paramName];

        // Find in regular parameters
        const paramIndex = newParameters.findIndex((p) => p.name === paramName);
        if (paramIndex >= 0) {
          newParameters[paramIndex] = {
            ...newParameters[paramIndex],
            ...metadata,
          };
        }

        // Find in categorical parameters
        Object.keys(newCategoricalParameters).forEach((category) => {
          const catParamIndex = newCategoricalParameters[category].findIndex(
            (p) => p.name === paramName,
          );
          if (catParamIndex >= 0) {
            newCategoricalParameters[category][catParamIndex] = {
              ...newCategoricalParameters[category][catParamIndex],
              ...metadata,
            };
          }
        });
      });

      return {
        toolParams: {
          ...state.toolParams,
          params: {
            ...currentParams,
            parameters: newParameters,
            categoricalParameters: newCategoricalParameters,
          },
        },
      };
    });
  },

  setDefaultToolParams: async (tool) => {
    set((state) => ({
      toolSaving: { ...state.toolSaving, isSaving: true },
    }));

    try {
      const response = await apiClient.post(`/api/tools/${tool}/default`);
      // Fetch new params after setting default
      await get().fetchToolParams(tool);
      return response.data;
    } finally {
      set((state) => ({
        toolSaving: { ...state.toolSaving, isSaving: false },
      }));
    }
  },

  checkMissingInputs: async (tool, parameters) => {
    if (!tool) {
      console.warn('Tool not specified for checking missing inputs.');
      return;
    }

    set((state) => ({
      missingInputs: {
        ...state.missingInputs,
        checking: true,
        error: undefined,
      },
    }));

    try {
      await apiClient.post(`/api/tools/${tool}/check`, parameters);
      set((state) => ({
        missingInputs: { ...state.missingInputs, checking: false, error: null },
      }));
    } catch (err) {
      let error;
      if (err.response?.status === 400) {
        error = err.response?.data?.detail?.script_suggestions;
      } else if (err.response?.status === 500) {
        error = err.response?.data?.detail || 'Internal server error';
      }
      set((state) => ({
        missingInputs: {
          ...state.missingInputs,
          checking: false,
          error,
        },
      }));
    }
  },

  resetMissingInputs: () => {
    set({
      missingInputs: { checking: false, error: false },
    });
  },
}));

export const useUpdateParameterMetadata = () =>
  useToolsStore((state) => state.updateParameterMetadata);

export const useSetDefaultToolParams = () =>
  useToolsStore((state) => state.setDefaultToolParams);

export const useSaveToolParams = () =>
  useToolsStore((state) => state.saveToolParams);

export const useMissingInputs = () =>
  useToolsStore((state) => state.missingInputs);

export const useCheckMissingInputs = () =>
  useToolsStore((state) => state.checkMissingInputs);

export const useResetMissingInputs = () =>
  useToolsStore((state) => state.resetMissingInputs);

export default useToolsStore;
