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

const updateValidation = (state, validation) => {
  const { isValid, ...props } = validation;
  const index = state.findIndex(
    o => props.id === o.id && props.row === o.row && props.column === o.column
  );
  index !== -1 && state.splice(index, 1);
  if (!isValid) {
    state.push(props);
  }
  return [...state];
};

const databaseValidation = (state = [], { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_VALIDATION:
      return updateValidation(state, payload.validation);
    case RESET_DATABASE_STATE:
      return [];
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
