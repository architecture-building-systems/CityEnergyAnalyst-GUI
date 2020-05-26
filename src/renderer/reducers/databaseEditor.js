import {
  RESET_DATABASE_STATE,
  UPDATE_DATABASE_VALIDATION,
  SET_ACTIVE_DATABASE,
  INIT_DATABASE_STATE,
  INIT_DATABASE_STATE_SUCCESS,
  INIT_DATABASE_STATE_FAILURE,
  ADD_DATABASE_ROW,
  EDIT_DATADBASE_DATA,
  RESET_DATABASE_UNDO
} from '../actions/databaseEditor';
import { combineReducers } from 'redux';
import { checkNestedProp, createNestedProp, deleteNestedProp } from '../utils';
import undoable from 'redux-undo';
import produce from 'immer';

const databaseValidation = (state = {}, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_VALIDATION: {
      const { isValid, database, sheet, column, row, value } = payload;
      // Check if invalid value exists in store
      if (checkNestedProp(state, database, sheet, row, column)) {
        // Remove value if it is corrected else add it to store
        if (isValid) deleteNestedProp(state, database, sheet, row, column);
        else state[database][sheet][row][column] = value;
        // Add to store if value does not exist
      } else if (!isValid) {
        createNestedProp(state, database, sheet, row, column);
        state[database][sheet][row][column] = value;
      }
      return { ...state };
    }
    case RESET_DATABASE_STATE:
      return {};
    default:
      return state;
  }
};

const databaseGlossary = (state = [], { type, payload }) => {
  switch (type) {
    case INIT_DATABASE_STATE_SUCCESS:
      return payload.glossary;
    case RESET_DATABASE_STATE:
      return [];
    default:
      return state;
  }
};

const databaseData = (state = {}, { type, payload }) => {
  switch (type) {
    case INIT_DATABASE_STATE_SUCCESS:
      return payload.data;
    case RESET_DATABASE_STATE:
      return {};
    case EDIT_DATADBASE_DATA: {
      const {
        category,
        databaseName,
        tableName,
        dataLocator,
        changes
      } = payload;
      return produce(state, draft => {
        for (let [row, column, oldValue, newValue] of changes) {
          let dataLocation = draft[category][databaseName];
          for (const loc of dataLocator) {
            dataLocation = dataLocation[loc];
            dataLocation[row][column] = newValue;
          }
        }
      });
    }
    // case ADD_DATABASE_ROW: {
    //   const { category, databaseName, tableName, locator, changes } = payload;
    //   const data = state[category][databaseName][sheetName];
    //   const lastRow = data[data.length - 1];
    //   let newRow = {};
    //   columns.forEach((value, index) => {
    //     newRow[value.data] = lastRow[value.data];
    //   });
    //   data.push(newRow);
    //   return {
    //     ...state,
    //     [category]: {
    //       ...state[category],
    //       [databaseName]: {
    //         ...state[category][databaseName],
    //         [sheetName]: [...data]
    //       }
    //     }
    //   };
    // }
    default:
      return state;
  }
};

const databaseSchema = (state = {}, { type, payload }) => {
  switch (type) {
    case INIT_DATABASE_STATE_SUCCESS:
      return payload.schema;
    case RESET_DATABASE_STATE:
      return {};
    default:
      return state;
  }
};

const databaseStatus = (state = { status: null }, { type, payload }) => {
  switch (type) {
    case INIT_DATABASE_STATE:
      return { status: 'fetching' };
    case INIT_DATABASE_STATE_SUCCESS:
      return { status: 'success' };
    case INIT_DATABASE_STATE_FAILURE:
      return { status: 'failed', error: payload };
    case RESET_DATABASE_STATE:
      return { status: null };
    default:
      return state;
  }
};

const databaseMenu = (
  state = { category: null, name: null },
  { type, payload }
) => {
  switch (type) {
    case SET_ACTIVE_DATABASE:
      return { category: payload.category, name: payload.name };
    case RESET_DATABASE_STATE:
      return { category: null, name: null };
    default:
      return state;
  }
};

const databaseChanges = (state = [], { type, payload }) => {
  switch (type) {
    case EDIT_DATADBASE_DATA:
      return produce(state, draft => {
        draft.push([...payload.changes]);
      });
    case RESET_DATABASE_STATE:
      return [];
    default:
      return state;
  }
};

const databaseEditor = combineReducers({
  status: databaseStatus,
  validation: databaseValidation,
  data: undoable(databaseData, { initTypes: [RESET_DATABASE_UNDO] }),
  schema: databaseSchema,
  glossary: databaseGlossary,
  menu: databaseMenu,
  changes: undoable(databaseChanges, { initTypes: [RESET_DATABASE_UNDO] })
});

export default databaseEditor;
