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
        toolList: { ...state.toolList, status: 'failed', error },
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
        toolParams: { ...state.toolParams, status: 'failed', error },
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
    } catch (error) {
      throw error;
    } finally {
      set((state) => ({
        toolSaving: { ...state.toolSaving, isSaving: false },
      }));
    }
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
    } catch (error) {
      throw error;
    } finally {
      set((state) => ({
        toolSaving: { ...state.toolSaving, isSaving: false },
      }));
    }
  },
}));

export default useToolsStore;
