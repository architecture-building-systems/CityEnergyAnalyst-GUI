import {
  GET_PROJECT,
  GET_PROJECT_FAILED,
  GET_PROJECT_SUCCESS
} from '../actions/project';

const initialState = {
  info: { name: '', path: '', scenario: '', scenarios: [] },
  isFetching: false,
  error: null
};

const project = (state = initialState, { type, payload }) => {
  switch (type) {
    case GET_PROJECT:
      return { ...state, ...payload };
    case GET_PROJECT_SUCCESS:
      return { ...state, ...payload };
    case GET_PROJECT_FAILED:
      return { ...state, ...initialState, ...payload };
    default:
      return state;
  }
};

export default project;
