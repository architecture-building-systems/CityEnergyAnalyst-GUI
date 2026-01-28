import { create } from 'zustand';
import { produce } from 'immer';
import { apiClient } from 'lib/api/axios';
import { arrayStartsWith } from 'utils';

export const FETCHING_STATUS = 'fetching';
export const SUCCESS_STATUS = 'success';
export const FAILED_STATUS = 'failed';
export const SAVING_STATUS = 'saving';

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
      const newValidation = produce(state.validation, (draft) => {
        // Check if invalid value exists in store
        const hasPath =
          draft?.[database]?.[sheet]?.[row]?.[column] !== undefined;

        if (hasPath) {
          // Remove value if it is corrected else add it to store
          if (isValid) {
            delete draft[database][sheet][row][column];
            // Clean up empty parent objects
            if (Object.keys(draft[database][sheet][row]).length === 0) {
              delete draft[database][sheet][row];
            }
            if (Object.keys(draft[database][sheet]).length === 0) {
              delete draft[database][sheet];
            }
            if (Object.keys(draft[database]).length === 0) {
              delete draft[database];
            }
          } else {
            draft[database][sheet][row][column] = value;
          }
        } else if (!isValid) {
          // Add to store if value does not exist
          // Immer handles creating nested objects automatically
          if (!draft[database]) draft[database] = {};
          if (!draft[database][sheet]) draft[database][sheet] = {};
          if (!draft[database][sheet][row]) draft[database][sheet][row] = {};
          draft[database][sheet][row][column] = value;
        }
      });

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

  // FIXME: Simplify parameters
  updateDatabaseData: (
    dataKey,
    index,
    field,
    oldValue,
    value,
    displayInfo,
    position,
  ) => {
    set((state) => {
      let _dataKey = dataKey;
      let _index;
      // Handle case where index is actually last element (e.g. use types dataset)
      const isNestedStructure =
        arrayStartsWith(_dataKey, ['ARCHETYPES', 'USE']) ||
        arrayStartsWith(_dataKey, ['COMPONENTS', 'CONVERSION']);

      if (isNestedStructure) {
        _dataKey = dataKey.slice(0, -1);
        _index = dataKey[dataKey.length - 1];
      }

      const table = getNestedValue(state.data, _dataKey);
      if (table === undefined) {
        console.error('Table not found for dataKey:', dataKey);
        return state;
      }

      // For nested structures with arrays, use position instead of index
      // when both are provided (position is more reliable for rows with duplicate codes)
      let rowIdentifier = index;
      if (isNestedStructure && position !== undefined) {
        const nestedTable = table?.[_index];
        if (Array.isArray(nestedTable)) {
          rowIdentifier = position;
        }
      }

      // Use Immer to update the data immutably
      const newData = produce(state.data, (draft) => {
        const draftTable = getNestedValue(draft, _dataKey);

        // Find the correct row by index and update the field
        // When _index is set, use nested table handling
        if (_index !== undefined && draftTable?.[_index]) {
          const nestedTable = draftTable[_index];

          // Check if it's an array or object
          if (Array.isArray(nestedTable)) {
            // For arrays, handle both numeric and string indices
            if (typeof rowIdentifier === 'number') {
              // Direct numeric position - use it directly
              if (
                rowIdentifier >= 0 &&
                rowIdentifier < nestedTable.length &&
                nestedTable[rowIdentifier]
              ) {
                nestedTable[rowIdentifier][field] = value;
              } else {
                console.error(
                  'Row not found for numeric position:',
                  rowIdentifier,
                  'in nested array (length:',
                  nestedTable?.length,
                  ')',
                );
              }
            } else if (typeof rowIdentifier === 'string') {
              // Find row by matching index column value
              const rowIndex = nestedTable.findIndex((row) => {
                return (
                  row?.code === rowIdentifier ||
                  row?.id === rowIdentifier ||
                  row?.name === rowIdentifier ||
                  Object.values(row || {}).includes(rowIdentifier)
                );
              });

              if (rowIndex !== -1 && nestedTable[rowIndex]) {
                nestedTable[rowIndex][field] = value;
              } else {
                console.error(
                  'Row not found for string index:',
                  rowIdentifier,
                  'in nested array',
                );
              }
            } else {
              console.error(
                'Invalid index type:',
                typeof rowIdentifier,
                'value:',
                rowIdentifier,
              );
            }
          } else if (typeof nestedTable === 'object') {
            // For objects (like monthly_multipliers), update field directly
            if (index === undefined || index === _index || index === 0) {
              nestedTable[field] = value;
            } else {
              console.error(
                'Unexpected index:',
                index,
                'for object field update in:',
                nestedTable,
              );
            }
          }
        } else if (index !== undefined && index !== null) {
          // Handle non-nested structures
          // Check if draftTable is an array with string indices (like 'code')
          if (Array.isArray(draftTable) && typeof index === 'string') {
            // Find the row by matching the index column value
            const rowIndex = draftTable.findIndex((row) => {
              // Try common index fields
              return (
                row?.code === index ||
                row?.id === index ||
                row?.name === index ||
                Object.values(row || {}).includes(index)
              );
            });

            if (rowIndex !== -1 && draftTable[rowIndex]) {
              draftTable[rowIndex][field] = value;
            } else {
              console.error(
                'Row not found for string index:',
                index,
                'in array table',
              );
            }
          } else if (draftTable?.[index]) {
            // Direct object key or numeric index access
            draftTable[index][field] = value;
          } else {
            console.error('Row not found for index:', index, 'in table');
          }
        } else {
          console.error('Row not found - invalid state:', {
            index,
            _index,
            field,
          });
        }
      });

      const change = {
        action: 'update',
        dataKey,
        index: rowIdentifier, // Use rowIdentifier for accurate tracking
        field,
        oldValue,
        value,
        ...(displayInfo && { displayInfo }),
      };

      return {
        data: newData,
        changes: [...state.changes, change],
      };
    });
  },

  addDatabaseRow: (dataKey, indexCol, rowData, action = 'create') => {
    set((state) => {
      let _dataKey = dataKey;
      let _index;

      // Handle case where index is actually last element (e.g. use types dataset, conversion components)
      // For ARCHETYPES > USE, the structure is: use.schedules._library[useTypeName] = array
      // For COMPONENTS > CONVERSION, the structure is: conversion[componentName] = array
      // Both need slicing because getNestedValue lowercases keys, but component names are case-sensitive
      if (
        arrayStartsWith(_dataKey, ['ARCHETYPES', 'USE']) ||
        arrayStartsWith(_dataKey, ['COMPONENTS', 'CONVERSION'])
      ) {
        _dataKey = dataKey.slice(0, -1);
        _index = dataKey[dataKey.length - 1];
      }

      const table = getNestedValue(state.data, _dataKey);
      if (table === undefined) {
        console.error('Table not found for dataKey:', dataKey);
        return state;
      }

      const index = rowData?.[indexCol];

      // Use Immer to create an immutable update - cleaner and more efficient
      const newData = produce(state.data, (draft) => {
        const draftTable = getNestedValue(draft, _dataKey);

        // For nested structures, access the component array
        let targetArray = draftTable;
        if (_index !== undefined && draftTable?.[_index]) {
          targetArray = draftTable[_index];
        }

        // Add the new row to the table
        if (Array.isArray(targetArray)) {
          targetArray.push(rowData);
        } else if (typeof targetArray === 'object' && indexCol) {
          if (rowData?.[indexCol] === undefined) {
            console.error(
              `Row data must contain the index field "${indexCol}"`,
              rowData,
            );
            return;
          }
          const rowIndex = rowData[indexCol];
          if (targetArray[rowIndex]) {
            console.error(
              `Row with index "${rowIndex}" already exists in the table.`,
              targetArray,
            );
            return;
          }
          // Clone rowData to avoid mutating the input
          const rowDataCopy = { ...rowData };
          // Remove index from the copy to avoid duplication
          delete rowDataCopy[indexCol];
          targetArray[rowIndex] = rowDataCopy;
        } else {
          console.error('Unable to determine table structure:', targetArray);
        }
      });

      return {
        data: newData,
        changes: [
          ...state.changes,
          {
            action,
            dataKey,
            index,
            field: indexCol,
            oldValue: '{}',
            value: JSON.stringify(rowData),
          },
        ],
      };
    });
  },

  deleteDatabaseRows: (dataKey, indexCol, rowIndices) => {
    set((state) => {
      let _dataKey = dataKey;
      let _index;

      // Handle case where index is actually last element (e.g. use types dataset, conversion components)
      // For ARCHETYPES > USE, the structure is: use.schedules._library[useTypeName] = array
      // For COMPONENTS > CONVERSION, the structure is: conversion[componentName] = array
      // Both need slicing because getNestedValue lowercases keys, but component names are case-sensitive
      if (
        arrayStartsWith(_dataKey, ['ARCHETYPES', 'USE']) ||
        arrayStartsWith(_dataKey, ['COMPONENTS', 'CONVERSION'])
      ) {
        _dataKey = dataKey.slice(0, -1);
        _index = dataKey[dataKey.length - 1];
      }

      const table = getNestedValue(state.data, _dataKey);
      if (table === undefined) {
        console.error('Table not found for dataKey:', dataKey);
        return state;
      }

      // Use Immer to create an immutable update
      const newData = produce(state.data, (draft) => {
        const draftTable = getNestedValue(draft, _dataKey);

        // For nested structures, access the component array
        let targetArray = draftTable;
        if (_index !== undefined && draftTable?.[_index]) {
          targetArray = draftTable[_index];
        }

        // Delete rows from the table
        if (Array.isArray(targetArray)) {
          // Check if we're using numeric positions or index column values
          const usingPositions = rowIndices.every(
            (idx) => typeof idx === 'number',
          );

          if (usingPositions) {
            // Delete by position (for nested structures with duplicate index values)
            const positionsToDelete = new Set(rowIndices);

            // Sort positions in descending order to delete from end to start
            const sortedPositions = Array.from(positionsToDelete).sort(
              (a, b) => b - a,
            );
            for (const position of sortedPositions) {
              if (position >= 0 && position < targetArray.length) {
                targetArray.splice(position, 1);
              }
            }
          } else {
            // Delete by index column value (for non-nested structures)
            const indicesToDelete = new Set(rowIndices);
            for (let i = targetArray.length - 1; i >= 0; i--) {
              const rowIndexValue = targetArray[i][indexCol];
              if (indicesToDelete.has(rowIndexValue)) {
                targetArray.splice(i, 1);
              }
            }
          }
        } else if (typeof targetArray === 'object' && indexCol) {
          // For objects, delete properties with matching indices
          rowIndices.forEach((rowIndex) => {
            if (targetArray[rowIndex]) {
              delete targetArray[rowIndex];
            }
          });
        } else {
          console.error('Unable to determine table structure:', targetArray);
        }
      });

      // Create change entries for each deleted row
      const usingPositions = rowIndices.every((idx) => typeof idx === 'number');

      const newChanges = rowIndices.map((index) => {
        // Find the row data before deletion
        let rowData = {};

        // For nested structures, need to access the nested array
        let sourceArray = table;
        if (_index !== undefined && table?.[_index]) {
          sourceArray = table[_index];
        }

        if (usingPositions && Array.isArray(sourceArray)) {
          // Get row by position
          rowData = sourceArray[index] || {};
        } else if (Array.isArray(sourceArray)) {
          // Get row by index column value
          const row = sourceArray.find((r) => r[indexCol] === index);
          rowData = row || {};
        } else if (typeof sourceArray === 'object') {
          // For object structures
          rowData = sourceArray[index] || {};
        }

        return {
          dataKey,
          index: usingPositions ? `position_${index}` : index,
          field: indexCol,
          action: 'delete',
          oldValue: JSON.stringify(rowData),
          value: '{}',
        };
      });

      return {
        data: newData,
        changes: [...state.changes, ...newChanges],
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

export const useDeleteDatabaseRows = () =>
  useDatabaseEditorStore((state) => state.deleteDatabaseRows);

export default useDatabaseEditorStore;
