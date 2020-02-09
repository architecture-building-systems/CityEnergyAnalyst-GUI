import {
  UPDATE_DATABASE_STATE,
  RESET_DATABASE_STATE,
  UPDATE_DATABASE_VALIDATION,
  FETCH_DATABASE_GLOSSARY_SUCCESS,
  FETCH_ALL_DATABASES_SUCCESS,
  FETCH_ALL_DATABASES_FAILURE,
  FETCH_ALL_DATABASES,
  SET_DATABASE_CATAGORY_TAB,
  SET_DATABASE_NAME_TAB
} from '../actions/databaseEditor';
import { combineReducers } from 'redux';
import { checkNestedProp, createNestedProp, deleteNestedProp } from '../utils';

const databaseValidation = (state = {}, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_VALIDATION: {
      const {
        isValid,
        database,
        sheet,
        column,
        row,
        value
      } = payload.validation;
      // Check if invalid value exists in store
      if (checkNestedProp(state, database, sheet, row, column)) {
        // Remove value if it is corrected else add it to store
        if (isValid) deleteNestedProp(state, database, sheet, row, column);
        else state[database][sheet][row][column] = value;
        // Add to store if value does not exist
      } else {
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
    case FETCH_DATABASE_GLOSSARY_SUCCESS:
      try {
        return payload.find(script => script.script === 'inputs').variables;
      } catch (err) {
        console.log(err);
        return [];
      }
    case RESET_DATABASE_STATE:
      return [];
    default:
      return state;
  }
};

const databaseData = (state = { data: {}, schema: {} }, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_STATE:
      return state;
    case FETCH_ALL_DATABASES:
      return { ...state, status: 'fetching' };
    case FETCH_ALL_DATABASES_SUCCESS:
      return {
        data: payload.data,
        schema: payload.schema
      };
    case FETCH_ALL_DATABASES_FAILURE:
      return {
        ...state,
        status: 'failed',
        error: payload.data
      };
    case RESET_DATABASE_STATE:
      return { data: {}, schema: {} };
    default:
      return state;
  }
};

    default:
      return state;
  }
};

const databaseEditor = combineReducers({
  validation: databaseValidation,
  databases: databaseData,
  glossary: databaseGlossary,
});

export default databaseEditor;
