import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';

// TODO: Replace with immer
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

const useDatabaseEditorStore = create((set) => ({
  // State
  status: { status: null },
  validation: {},
  data: {},
  schema: {},
  glossary: [],
  changes: [],

  // Actions
  initDatabaseState: async () => {
    set({ data: {}, status: { status: 'fetching' } });
    try {
      const { data } = await apiClient.get('/api/inputs/databases');
      set({ data, status: { status: 'success' } });

      // if (Object.keys(data).length > 0) {
      //   const tableNames = [];

      //   for (const [category, tables] of Object.entries(data)) {
      //     for (const name of Object.keys(tables)) {
      //       tableNames.push({ category, name });
      //     }
      //   }
      //   set({ tableNames });
      // }
    } catch (error) {
      const err = error.response || error;
      set({ status: { status: 'failed', error: err } });
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

  fetchDatabaseSchema: async (params) => {
    try {
      const response = await apiClient.get('/api/databases/schema', { params });
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

const getNestedValue = (obj, datakey) => {
  let current = obj;

  if (!datakey || !Array.isArray(datakey)) return undefined;

  for (const key of datakey) {
    if (current == null) return undefined;
    current = current[key.toLowerCase()];
  }
  return current;
};

export const useDatabaseSchema = (dataKey) => {
  // Get column schema for using specific data key which is a list of property names

  const schema = useDatabaseEditorStore(
    (state) => getNestedValue(state.schema, dataKey)?.schema,
  );
  return schema;
};

export const useGetDatabaseColumnChoices = () => {
  const data = useDatabaseEditorStore((state) => state.data);
  console.log(data);
  return (dataKey, column) => {
    const _data = getNestedValue(data, dataKey);

    // FIXME: This is not reliable as not every index is "code"
    // Get keys if column is 'code'
    if (column == 'code') {
      return Object.keys(_data || {}).map((key) => ({
        value: key,
        label: _data[key]?.description ?? '-',
      }));
    }

    return _data?.[column];
  };
};

export default useDatabaseEditorStore;
