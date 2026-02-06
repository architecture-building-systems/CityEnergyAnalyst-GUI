import { create } from 'zustand';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

const useToolsStore = create((set) => ({
  // Tool Saving State
  toolSaving: {
    isSaving: false,
  },

  // Missing Inputs State
  missingInputs: {
    checking: false,
    error: undefined, // undefined means have not checked yet, null means no error
  },

  // Parameter Metadata Refetch State
  isRefetching: false,

  // Actions

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

  setDefaultToolParams: async (tool, queryClient) => {
    set((state) => ({
      toolSaving: { ...state.toolSaving, isSaving: true },
    }));

    try {
      const response = await apiClient.post(`/api/tools/${tool}/default`);
      // Invalidate query to refetch params after setting default
      if (queryClient) {
        await queryClient.invalidateQueries({ queryKey: ['toolParams', tool] });
      }
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

  setIsRefetching: (isRefetching) => {
    set({ isRefetching });
  },
}));

export const useSetDefaultToolParams = () => {
  const setDefaultToolParams = useToolsStore(
    (state) => state.setDefaultToolParams,
  );
  const queryClient = useQueryClient();

  // Return wrapper that automatically injects queryClient
  return (tool) => setDefaultToolParams(tool, queryClient);
};

export const useSaveToolParams = () =>
  useToolsStore((state) => state.saveToolParams);

export const useMissingInputs = () =>
  useToolsStore((state) => state.missingInputs);

export const useCheckMissingInputs = () =>
  useToolsStore((state) => state.checkMissingInputs);

export const useResetMissingInputs = () =>
  useToolsStore((state) => state.resetMissingInputs);

export const useIsRefetching = () =>
  useToolsStore((state) => state.isRefetching);

export const useSetIsRefetching = () =>
  useToolsStore((state) => state.setIsRefetching);

export default useToolsStore;
