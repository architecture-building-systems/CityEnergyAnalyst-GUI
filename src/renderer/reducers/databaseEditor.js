import {
  FETCH_DATABASE,
  FETCH_DATABASE_SUCCESS,
  FETCH_DATABASE_FAILURE,
  UPDATE_DATABASE_STATE,
  RESET_DATABASE_STATE,
  UPDATE_DATABASE_VALIDATION,
  FETCH_DATABASE_GLOSSARY_SUCCESS
} from '../actions/databaseEditor';
import { combineReducers } from 'redux';
import { checkNestedProp, createNestedProp, deleteNestedProp } from '../utils';

const updateValidation = (state, validation) => {
  const { isValid, database, sheet, column, row, value } = validation;
  // Check if invalid value exists in store
  if (checkNestedProp(state, database, sheet, column, row)) {
    // Remove value if it is corrected else add it to store
    if (isValid) deleteNestedProp(state, database, sheet, column, row);
    else state[database][sheet][column][row] = value;
    // Add to store if value does not exist
  } else {
    createNestedProp(state, database, sheet, column, row);
    state[database][sheet][column][row] = value;
  }
  return { ...state };
};

const databaseValidation = (state = {}, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_VALIDATION:
      return updateValidation(state, payload.validation);
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
    default:
      return state;
  }
};

const databaseData = (state = {}, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_STATE:
      return state;
    case FETCH_DATABASE:
      return {
        ...state,
        [payload.db]: { status: 'fetching', data: {} }
      };
    case FETCH_DATABASE_SUCCESS:
      return {
        ...state,
        [payload.db]: {
          status: 'received',
          data: payload.data,
          schema: payload.schema
        }
      };
    case FETCH_DATABASE_FAILURE:
      return {
        ...state,
        [payload.db]: { status: 'failed', error: payload.data }
      };
    case RESET_DATABASE_STATE:
      return {};
    default:
      return state;
  }
};

const databaseEditor = combineReducers({
  validation: databaseValidation,
  data: databaseData,
  glossary: databaseGlossary
});

export default databaseEditor;
