import { create } from 'zustand';
import { produce } from 'immer';
import { apiClient, getScenarioClient } from 'lib/api/axios';
import { activeScenarioHeaders } from 'lib/api/scenarioContext';
import { arrayStartsWith, arraysEqual } from 'utils';
import {
  MAX_INDEX_NAME_LENGTH,
  droppedCharacters,
  normaliseIndexName,
  uniqueIndexName,
} from 'utils/validation';

export const FETCHING_STATUS = 'fetching';
export const SUCCESS_STATUS = 'success';
export const FAILED_STATUS = 'failed';
export const SAVING_STATUS = 'saving';

// Where MATERIALS.csv lives in the database payload. Only some regional databases ship it,
// so this node is `null` for most scenarios.
export const MATERIALS_DATA_KEY = ['COMPONENTS', 'MATERIALS', 'materials'];

// The envelope columns derived from material layers, mirroring DERIVED_COLS_BY_KIND in
// cea/datamanagement/database/assemblies.py. Used only to lock cells in the table -- the
// backend derives the values, so drifting from that list degrades the hint, not the data.
export const DERIVED_ENVELOPE_COLUMNS = [
  'U_wall',
  'U_roof',
  'U_base',
  'GHG_wall_kgCO2m2',
  'GHG_roof_kgCO2m2',
  'GHG_floor_kgCO2m2',
  'GHG_biogenic_wall_kgCO2m2',
  'GHG_biogenic_roof_kgCO2m2',
  'GHG_biogenic_floor_kgCO2m2',
];

/** Does this row define its construction with material layers? Mirrors _row_has_usable_material_layer. */
export const rowHasMaterialLayer = (row) =>
  [1, 2, 3].some(
    (slot) =>
      Number(row?.[`thickness_${slot}_m`]) > 0 &&
      String(row?.[`material_name_${slot}`] ?? '').trim() !== '',
  );

// The envelope material layer set (ENVELOPE_WALL/ROOF/FLOOR). These reference MATERIALS.csv,
// which only some regional databases ship, so they are hidden when it is absent.
export const MATERIAL_LAYER_COLUMNS = [
  'material_name_1',
  'thickness_1_m',
  'material_name_2',
  'thickness_2_m',
  'material_name_3',
  'thickness_3_m',
];

const useDatabaseEditorStore = create((set, get) => ({
  // State
  status: { status: null },
  validation: {},
  data: {},
  schema: {},
  changes: [],
  isEmpty: false,
  databaseValidation: { status: null, message: null },
  // Which domain/category/dataset the editor is showing. Kept here rather than in
  // DatabaseContainer because that component unmounts whenever `data` is briefly blanked,
  // which would discard a local useState — and because actions need to navigate the editor
  // (seeding MATERIALS has to land the user on the table it just created).
  selection: { domain: null, category: null, dataset: null },

  // Getters
  getColumnChoices: (dataKey, column) => {
    const state = get();
    const _data = getNestedValue(state.data, dataKey);
    const _columns = getNestedValue(state.schema, dataKey)?.schema?.columns;

    // A lookup that targets the referenced table's primary column is asking for its row keys,
    // because that column is the key the table is stored under. Read the primary from the
    // schema rather than assuming 'code' — MATERIALS is keyed by `name`.
    const primary =
      Object.keys(_columns ?? {}).find((c) => _columns[c]?.primary) ?? 'code';
    if (column == primary) {
      const keys = Object.keys(_data ?? {});
      // Annotate with descriptions where the table has them; otherwise the bare keys are
      // the whole choice (MATERIALS has no description column).
      if (_columns?.description == undefined) return keys;
      return Object.fromEntries(
        keys.map((key) => [key, _data[key]?.description ?? '-']),
      );
    }

    return _data?.[column];
  },

  // Actions
  setSelection: ({ domain, category, dataset = null }) =>
    set({ selection: { domain, category, dataset } }),

  setSelectedDataset: (dataset) =>
    set((state) => ({ selection: { ...state.selection, dataset } })),

  validateDatabase: async ({ background = false } = {}) => {
    const { isEmpty } = useDatabaseEditorStore.getState();

    // Skip validation if database is empty
    if (isEmpty) {
      set({ databaseValidation: { status: null, message: null } });
      return;
    }

    // `checking` swaps the whole editor for a spinner. That is right on first load, but after
    // a save it would tear down the table the user is working in. In the background the
    // previous status stands until the result replaces it, so only the message area changes.
    if (!background)
      set({ databaseValidation: { status: 'checking', message: null } });
    try {
      await getScenarioClient().get('/inputs/databases/check', {
        headers: activeScenarioHeaders(),
      });
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
    // A different scenario's database may not have the selected category at all.
    set({
      data: {},
      status: { status: FETCHING_STATUS },
      isEmpty: false,
      selection: { domain: null, category: null, dataset: null },
    });
    try {
      await useDatabaseEditorStore.getState().refreshDatabaseData();
      set({ status: { status: SUCCESS_STATUS } });

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

  /**
   * Reload the database without tearing the page down.
   *
   * `initDatabaseState` flips status to FETCHING, which makes DatabaseEditor render a
   * spinner instead of DatabaseContainer — unmounting it and losing the selected
   * domain/category/dataset, which live in its component state. Use this after an action
   * that changes one table (e.g. seeding MATERIALS.csv) so the user stays where they were.
   */
  refreshDatabaseData: async ({ background = false } = {}) => {
    const { data } = await getScenarioClient().get('/inputs/databases', {
      headers: activeScenarioHeaders(),
    });
    set({
      data,
      validation: {},
      changes: [],
      isEmpty: false,
      databaseValidation: { status: null, message: null },
    });
    await useDatabaseEditorStore.getState().validateDatabase({ background });
  },

  saveDatabaseState: async ({ overwriteDerived = false } = {}) => {
    const { data, changes } = useDatabaseEditorStore.getState();

    try {
      set({ status: { status: SAVING_STATUS } });
      await apiClient.put('/inputs/databases', data, {
        headers: activeScenarioHeaders(),
        params: overwriteDerived ? { overwrite_derived: true } : undefined,
      });
      set({ status: { status: SUCCESS_STATUS }, changes: [] });
      // Re-read rather than keep what the browser sent: the server derives envelope U/GHG
      // from the material layers as it writes, so the values in the table are no longer the
      // ones on disk. This also runs the verifier, reporting any cross-row or cross-file rule
      // the browser cannot check on its own while the user still knows what they changed.
      await useDatabaseEditorStore.getState().refreshDatabaseData({
        background: true,
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (
        error?.response?.status !== 409 ||
        detail?.status !== 'derived_conflict'
      ) {
        throw error;
      }
      // The server reports every stored value that disagrees with its layers. Re-editing an
      // existing layer set is *expected* to disagree -- the stored value describes the
      // previous composition -- so confirming it would mean a dialog on every material edit.
      // Anything else is about to destroy a value someone entered deliberately.
      const unexplained = (detail.conflicts ?? []).filter(
        (conflict) => !conflictIsStaleCache(data, changes, conflict),
      );
      if (unexplained.length === 0) {
        return useDatabaseEditorStore
          .getState()
          .saveDatabaseState({ overwriteDerived: true });
      }
      throw new DerivedConflictError(detail.message, unexplained);
    } finally {
      set({ status: { status: null } });
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
      const response = await getScenarioClient().get('/databases/schema', {
        params,
      });
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

        // Add the new row at the top, so it is visible without scrolling a long table
        // (this is also the order written to the CSV on save).
        if (Array.isArray(targetArray)) {
          targetArray.unshift(rowData);
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
          // Object key order is the row order, so rebuild with the new key first rather
          // than assigning, which would append.
          const existing = { ...targetArray };
          for (const key of Object.keys(targetArray)) delete targetArray[key];
          targetArray[rowIndex] = rowDataCopy;
          Object.assign(targetArray, existing);
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

  /**
   * Rename a row's index value (its `code` / `name` / `const_type`).
   *
   * For object-keyed tables the index IS the object key, so this moves the key rather than
   * setting a field — setting the field would be dropped on save, since `BaseDatabase.save`
   * excludes the column matching the index name. Array-shaped tables keep the index as an
   * ordinary field, so there it is a plain assignment.
   *
   * Returns `{ ok, name, reason }`; `name` is what was actually used, which the caller
   * compares against what the user typed in order to report the change.
   */
  renameDatabaseRowIndex: (dataKey, indexCol, oldIndex, newIndex) => {
    const typed = String(newIndex ?? '').trim();
    // Before the emptiness check: a wholly non-Latin name normalises to "" and would
    // otherwise be reported as empty, which is not what the user typed.
    const dropped = droppedCharacters(typed);
    if (dropped)
      return {
        ok: false,
        reason: `${indexCol} must use Latin letters, numbers, underscores or hyphens - "${dropped}" cannot be converted.`,
      };
    const requested = normaliseIndexName(typed);
    if (!requested)
      return { ok: false, reason: `${indexCol} cannot be empty.` };
    if (requested.length > MAX_INDEX_NAME_LENGTH)
      return {
        ok: false,
        reason: `${indexCol} must be ${MAX_INDEX_NAME_LENGTH} characters or fewer (this is ${requested.length}).`,
      };

    let result = { ok: true, name: requested };
    set((state) => {
      let _dataKey = dataKey;
      let _nested;
      if (
        arrayStartsWith(dataKey, ['ARCHETYPES', 'USE']) ||
        arrayStartsWith(dataKey, ['COMPONENTS', 'CONVERSION'])
      ) {
        _dataKey = dataKey.slice(0, -1);
        _nested = dataKey[dataKey.length - 1];
      }

      const table = getNestedValue(state.data, _dataKey);
      if (table === undefined) {
        result = { ok: false, reason: 'Table not found.' };
        return state;
      }

      const rows =
        _nested !== undefined && table?.[_nested] ? table[_nested] : table;
      const taken = new Set(
        Array.isArray(rows)
          ? rows.map((row) => row?.[indexCol]).filter((v) => v !== oldIndex)
          : Object.keys(rows).filter((key) => key !== oldIndex),
      );
      const name = uniqueIndexName(requested, taken);
      result = { ok: true, name };
      if (name === oldIndex) return state;

      const newData = produce(state.data, (draft) => {
        const draftTable = getNestedValue(draft, _dataKey);
        const target =
          _nested !== undefined && draftTable?.[_nested]
            ? draftTable[_nested]
            : draftTable;

        if (Array.isArray(target)) {
          const row = target.find((r) => r?.[indexCol] === oldIndex);
          if (!row) {
            result = { ok: false, reason: `Could not find row "${oldIndex}".` };
            return;
          }
          row[indexCol] = name;
          return;
        }

        if (!(oldIndex in target)) {
          result = { ok: false, reason: `Could not find row "${oldIndex}".` };
          return;
        }
        // Rebuild to keep the row in place rather than moving it to the end.
        const renamed = Object.fromEntries(
          Object.entries(target).map(([key, value]) => [
            key === oldIndex ? name : key,
            value,
          ]),
        );
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, renamed);
      });

      if (!result.ok) return state;

      return {
        data: newData,
        changes: state.changes.map((change) =>
          change.index === oldIndex && arraysEqual(change.dataKey, dataKey)
            ? { ...change, index: name }
            : change,
        ),
      };
    });
    return result;
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

/** Raised when a save is refused because stored values contradict their material layers. */
export class DerivedConflictError extends Error {
  constructor(message, conflicts) {
    super(message);
    this.name = 'DerivedConflictError';
    this.conflicts = conflicts;
  }
}

const changeTouchesRow = (change, conflict) =>
  change.action === 'update' &&
  String(change.index) === String(conflict.code) &&
  String(change.dataKey?.[change.dataKey.length - 1]).toLowerCase() ===
    conflict.table;

/**
 * Is this conflict just a cache left over from the row's previous composition?
 *
 * True only when the user edited a layer on a row that *already had* layers: the stored value
 * was derived from the old composition and means nothing now. If the row had no layers before,
 * its U/GHG were typed by hand -- adding layers is about to destroy them, which is a decision
 * for the user, not something to do silently.
 */
const conflictIsStaleCache = (data, changes, conflict) => {
  const table = getNestedValue(data, [
    'ASSEMBLIES',
    'ENVELOPE',
    conflict.table,
  ]);
  const current = table?.[conflict.code];
  if (current == null) return false;

  // Rebuild the row as it was before this session's layer edits.
  const before = { ...current };
  const reverted = new Set();
  for (const change of changes ?? []) {
    if (!changeTouchesRow(change, conflict)) continue;
    if (!MATERIAL_LAYER_COLUMNS.includes(change.field)) continue;
    // The earliest change to a field carries the value it held before this session.
    if (reverted.has(change.field)) continue;
    before[change.field] = change.oldValue;
    reverted.add(change.field);
  }

  // Untouched layers mean the composition did not change, so any disagreement predates this
  // session rather than being left over from an edit.
  if (reverted.size === 0) return false;
  return rowHasMaterialLayer(before);
};

const getNestedValue = (obj, datakey) => {
  let current = obj;

  if (!datakey || !Array.isArray(datakey)) return undefined;

  for (const key of datakey) {
    if (current == null) return undefined;
    current = current[key.toLowerCase()];
  }
  return current;
};

export const useDatabaseSelection = () =>
  useDatabaseEditorStore((state) => state.selection);

export const useMaterialsAvailable = () =>
  useDatabaseEditorStore(
    (state) => getNestedValue(state.data, MATERIALS_DATA_KEY) != null,
  );

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

export const useRenameDatabaseRowIndex = () =>
  useDatabaseEditorStore((state) => state.renameDatabaseRowIndex);

export const useDeleteDatabaseRows = () =>
  useDatabaseEditorStore((state) => state.deleteDatabaseRows);

export default useDatabaseEditorStore;
