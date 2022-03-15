import {
  UPDATE_DATABASE_CHANGES,
  RESET_DATABASE_STATE,
  FETCH_DATABASE_DATA_SUCCESS,
  UPDATE_DATABASE_VALIDATION,
  FETCH_DATABASE_GLOSSARY_SUCCESS,
  SET_ACTIVE_DATABASE,
  FETCH_DATABASE_SCHEMA_SUCCESS,
  INIT_DATABASE_STATE,
  INIT_DATABASE_STATE_SUCCESS,
  FETCH_DATABASE_DATA_FAILURE,
  FETCH_DATABASE_SCHEMA_FAILURE,
  FETCH_DATABASE_GLOSSARY_FAILURE,
  RESET_DATABASE_CHANGES,
  COPY_SCHEDULE_DATA,
} from '../actions/databaseEditor';
import { combineReducers } from 'redux';
import { createNestedProp, deleteNestedProp } from '../utils';

const databaseValidation = (state = {}, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_VALIDATION: {
      const { isValid, database, sheet, column, row, value } = payload;
      // Check if invalid value exists in store
      if (state?.database?.sheet?.row?.column) {
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
    case FETCH_DATABASE_GLOSSARY_SUCCESS:
      try {
        return payload.find((script) => script.script === 'data_initializer')
          .variables;
      } catch (err) {
        console.error(err);
        return [];
      }
    case RESET_DATABASE_STATE:
      return [];
    default:
      return state;
  }
};

const databaseData = (state = {}, { type, payload }) => {
  switch (type) {
    case FETCH_DATABASE_DATA_SUCCESS:
      return payload;
    case RESET_DATABASE_STATE:
      return {};
    // FIXME: Hardcoded location of schedules database
    case COPY_SCHEDULE_DATA:
      return {
        ...state,
        archetypes: {
          ...state.archetypes,
          schedules: {
            ...state.archetypes.schedules,
            [payload.name]: {
              ...state.archetypes.schedules[payload.copy],
            },
          },
        },
      };
    default:
      return state;
  }
};

const databaseSchema = (state = {}, { type, payload }) => {
  switch (type) {
    case FETCH_DATABASE_SCHEMA_SUCCESS:
      return payload;
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
    case FETCH_DATABASE_DATA_FAILURE:
    case FETCH_DATABASE_SCHEMA_FAILURE:
    case FETCH_DATABASE_GLOSSARY_FAILURE:
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
    case UPDATE_DATABASE_CHANGES:
      return [...state, payload];
    case RESET_DATABASE_CHANGES:
    case RESET_DATABASE_STATE:
      return [];
    default:
      return state;
  }
};

const databaseEditor = combineReducers({
  status: databaseStatus,
  validation: databaseValidation,
  data: databaseData,
  schema: databaseSchema,
  glossary: databaseGlossary,
  menu: databaseMenu,
  changes: databaseChanges,
});

export default databaseEditor;
