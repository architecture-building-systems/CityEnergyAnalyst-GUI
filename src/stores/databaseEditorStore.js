import { create } from 'zustand';
import { apiClient } from '../api/axios';

// Utility functions (from the original utils)
const createNestedProp = (obj, ...keys) => {
  keys.reduce((curr, key, index) => {
    if (index === keys.length - 1) {
      return curr;
    }
    if (!curr[key]) {
      curr[key] = {};
    }
    return curr[key];
  }, obj);
};

const deleteNestedProp = (obj, ...keys) => {
  const lastKey = keys.pop();
  const parent = keys.reduce((curr, key) => curr && curr[key], obj);
  if (parent && parent[lastKey]) {
    delete parent[lastKey];
  }
};

const useDatabaseEditorStore = create((set, get) => ({
  // State
  status: { status: null },
  validation: {},
  data: {},
  schema: {},
  glossary: [],
  menu: { category: null, name: null },
  changes: [],

  // Actions
  initDatabaseState: async () => {
    set({ status: { status: 'fetching' } });
    try {
      // This would typically fetch initial data
      set({ status: { status: 'success' } });
    } catch (error) {
      set({ status: { status: 'failed', error } });
    }
  },

  resetDatabaseState: () => {
    set({
      status: { status: null },
      validation: {},
      data: {},
      schema: {},
      glossary: [],
      menu: { category: null, name: null },
      changes: [],
    });
  },

  fetchDatabaseData: async (params) => {
    try {
      const response = await apiClient.get('/api/database/data', { params });
      set({ data: response.data });
    } catch (error) {
      set({ status: { status: 'failed', error } });
    }
  },

  fetchDatabaseSchema: async (params) => {
    try {
      const response = await apiClient.get('/api/database/schema', { params });
      set({ schema: response.data });
    } catch (error) {
      set({ status: { status: 'failed', error } });
    }
  },

  fetchDatabaseGlossary: async () => {
    try {
      const response = await apiClient.get('/api/database/glossary');
      const glossary =
        response.data.find((script) => script.script === 'data_initializer')
          ?.variables || [];
      set({ glossary });
    } catch (error) {
      console.error(error);
      set({ glossary: [], status: { status: 'failed', error } });
    }
  },

  setActiveDatabase: (category, name) => {
    set({ menu: { category, name } });
  },

  updateDatabaseValidation: ({
    isValid,
    database,
    sheet,
    column,
    row,
    value,
  }) => {
    set((state) => {
      const newValidation = { ...state.validation };

      // Check if invalid value exists in store
      if (newValidation?.database?.sheet?.row?.column) {
        // Remove value if it is corrected else add it to store
        if (isValid) {
          deleteNestedProp(newValidation, database, sheet, row, column);
        } else {
          newValidation[database][sheet][row][column] = value;
        }
      } else if (!isValid) {
        // Add to store if value does not exist
        createNestedProp(newValidation, database, sheet, row, column);
        newValidation[database][sheet][row][column] = value;
      }

      return { validation: newValidation };
    });
  },

  updateDatabaseChanges: (change) => {
    set((state) => ({
      changes: [...state.changes, change],
    }));
  },

  resetDatabaseChanges: () => {
    set({ changes: [] });
  },

  copyScheduleData: (name, copy) => {
    set((state) => ({
      data: {
        ...state.data,
        archetypes: {
          ...state.data.archetypes,
          schedules: {
            ...state.data.archetypes.schedules,
            [name]: {
              ...state.data.archetypes.schedules[copy],
            },
          },
        },
      },
    }));
  },
}));

export default useDatabaseEditorStore;
