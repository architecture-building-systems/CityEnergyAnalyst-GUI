import { create } from 'zustand';
import { apiClient } from 'lib/api/axios';
import { arrayStartsWith } from 'utils';

export const FETCHING_STATUS = 'fetching';
export const SUCCESS_STATUS = 'success';
export const FAILED_STATUS = 'failed';
export const SAVING_STATUS = 'saving';

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

const useDatabaseEditorStore = create((set, get) => ({
  // State
  status: { status: null },
  validation: {},
  data: {},
  schema: {},
  changes: [],
  isEmpty: false,
  databaseValidation: { status: null, message: null },

  // Getters
  getColumnChoices: (dataKey, column) => {
    const data = get().data;
    const _data = getNestedValue(data, dataKey);

    // FIXME: This is not reliable as not every index is "code"
    // Get keys if column is 'code'
    if (column == 'code') {
      const choices = {};
      Object.keys(_data || {}).forEach((key) => {
        choices[key] = _data[key]?.description ?? '-';
      });
      return choices;
    }

    return _data?.[column];
  },

  // Actions
  validateDatabase: async () => {
    const { isEmpty } = useDatabaseEditorStore.getState();

    // Skip validation if database is empty
    if (isEmpty) {
      set({ databaseValidation: { status: null, message: null } });
      return;
    }

    set({ databaseValidation: { status: 'checking', message: null } });
    try {
      await apiClient.get('/api/inputs/databases/check');
      set({ databaseValidation: { status: 'valid', message: null } });
    } catch (error) {
      console.log(error);
      if (error.response?.status === 400 && error.response?.data) {
        const { status, message } = error.response.data?.detail || {};
        set({
          databaseValidation: {
            status: status || 'error',
            message,
          },
        });
      } else {
        set({
          databaseValidation: {
            status: 'invalid',
            message: 'Could not read and verify databases.',
          },
        });
      }
    }
  },

  initDatabaseState: async () => {
    set({ data: {}, status: { status: FETCHING_STATUS }, isEmpty: false });
    try {
      const { data } = await apiClient.get('/api/inputs/databases');
      set({
        data,
        status: { status: SUCCESS_STATUS },
        validation: {},
        changes: [],
        isEmpty: false,
        databaseValidation: { status: null, message: null },
      });

      // Run validation after successful database load
      await useDatabaseEditorStore.getState().validateDatabase();

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
      // Check if it's a 404 (empty database)
      if (error.response?.status === 404) {
        set({
          data: {},
          status: { status: SUCCESS_STATUS },
          validation: {},
          changes: [],
          isEmpty: true,
          databaseValidation: { status: null, message: null },
        });
      } else {
        set({ status: { status: FAILED_STATUS, error: err }, isEmpty: false });
      }
    }
  },

  saveDatabaseState: async () => {
    const data = useDatabaseEditorStore.getState().data;

    try {
      set({ status: { status: SAVING_STATUS } });
      await apiClient.put('/api/inputs/databases', data);
      set({ status: { status: SUCCESS_STATUS }, changes: [] });
    } catch (error) {
      if (error.response?.status === 401) {
        set({ status: { status: null } });
        throw error;
      }
      const err = error.response || error;
      set({ status: { status: FAILED_STATUS, error: err } });
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
      isEmpty: false,
      databaseValidation: { status: null, message: null },
    });
  },

  fetchDatabaseSchema: async (params) => {
    try {
      const response = await apiClient.get('/api/databases/schema', { params });
      set({ schema: response.data });
    } catch (error) {
      set({ status: { status: FAILED_STATUS, error } });
    }
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

  updateDatabaseData: (dataKey, index, field, oldValue, value) => {
    set((state) => {
      const newData = { ...state.data };

      let _dataKey = dataKey;
      let _index;
      // Handle case where index is actually last element (e.g. use types dataset)
      if (
        arrayStartsWith(_dataKey, ['ARCHETYPES', 'USE']) ||
        arrayStartsWith(_dataKey, ['COMPONENTS', 'CONVERSION'])
      ) {
        _dataKey = dataKey.slice(0, -1);
        _index = dataKey[dataKey.length - 1];
      }

      const table = getNestedValue(newData, _dataKey);
      if (table === undefined) {
        console.error('Table not found for dataKey:', dataKey);
        return state;
      }

      // Find the correct row by index
      if (index !== undefined && table?.[index]) {
        // Update the field in the row
        table[index][field] = value;
      } else if (_index !== undefined && table?.[_index]) {
        table[_index][field] = value;
      } else {
        console.error('Row not found for index:', index, 'in table:', table);
      }

      return {
        data: newData,
        changes: [...state.changes, { dataKey, index, field, oldValue, value }],
      };
    });
  },

  addDatabaseRow: (dataKey, indexCol, rowData) => {
    set((state) => {
      const newData = { ...state.data };

      let _dataKey = dataKey;
      // Handle case where index is actually last element (e.g. use types dataset)
      if (
        arrayStartsWith(_dataKey, ['ARCHETYPES', 'USE']) ||
        arrayStartsWith(_dataKey, ['COMPONENTS', 'CONVERSION'])
      ) {
        _dataKey = dataKey.slice(0, -1);
      }

      const table = getNestedValue(newData, _dataKey);
      if (table === undefined) {
        console.error('Table not found for dataKey:', dataKey);
        return state;
      }

      const index = rowData?.[indexCol];
      // Add the new row to the table
      if (Array.isArray(table)) {
        table.push(rowData);
      } else if (typeof table === 'object' && indexCol) {
        if (rowData?.[indexCol] === undefined) {
          console.error(
            `Row data must contain the index field "${indexCol}"`,
            rowData,
          );
          return state;
        }
        const rowIndex = rowData[indexCol];
        if (table[rowIndex]) {
          console.error(
            `Row with index "${rowIndex}" already exists in the table.`,
            table,
          );
          return state;
        }
        // Clone rowData to avoid mutating the input
        const rowDataCopy = { ...rowData };
        // Remove index from the copy to avoid duplication
        delete rowDataCopy[indexCol];
        table[rowIndex] = rowDataCopy;
      } else {
        console.error('Unable to determine table structure:', table);
        console.log(indexCol, table);
        return state;
      }

      // Clone rowData for changes tracking to preserve the original
      const rowDataForChanges = { ...rowData };

      return {
        data: newData,
        changes: [
          ...state.changes,
          {
            dataKey,
            index,
            field: indexCol,
            action: 'add',
            oldValue: '{}',
            value: JSON.stringify(rowDataForChanges),
          },
        ],
      };
    });
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

export const useGetDatabaseColumnChoices = () =>
  useDatabaseEditorStore((state) => state.getColumnChoices);

export const useUpdateDatabaseData = () =>
  useDatabaseEditorStore((state) => state.updateDatabaseData);

export const useAddDatabaseRow = () =>
  useDatabaseEditorStore((state) => state.addDatabaseRow);

export default useDatabaseEditorStore;
