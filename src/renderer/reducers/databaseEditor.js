import {
  FETCH_DATABASE,
  FETCH_DATABASE_SUCCESS,
  FETCH_DATABASE_FAILED,
  UPDATE_DATABASE_STATE,
  RESET_DATABASE_STATE,
  UPDATE_DATABASE_VALIDATION
} from '../actions/databaseEditor';

const updateValidation = (state, validation) => {
  const { isValid, ...props } = validation;
  const index = state.validation.findIndex(
    o => props.id === o.id && props.row === o.row && props.column === o.column
  );
  index !== -1 && state.validation.splice(index, 1);
  if (!isValid) {
    state.validation.push(props);
  }
  state.validation = [...state.validation];
  return state;
};

const initialState = { validation: [] };
const databaseData = (state = initialState, { type, payload }) => {
  switch (type) {
    case UPDATE_DATABASE_STATE:
      return state;
    case UPDATE_DATABASE_VALIDATION:
      return updateValidation(state, payload.validation);
    case FETCH_DATABASE:
      return {
        ...state,
        [payload.db]: { status: 'fetching', data: {} }
      };
    case FETCH_DATABASE_SUCCESS:
      console.log(payload);
      return {
        ...state,
        [payload.db]: {
          status: 'received',
          data: payload.data,
          schema: payload.schema
        }
      };
    case FETCH_DATABASE_FAILED:
      return {
        ...state,
        [payload.db]: { status: 'failed', error: payload.data }
      };
    case RESET_DATABASE_STATE:
      return { validation: [] };
    default:
      return state;
  }
};

export default databaseData;
