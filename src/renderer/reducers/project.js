import {
  GET_PROJECT,
  GET_PROJECT_FAILED,
  GET_PROJECT_SUCCESS,
  UPDATE_SCENARIO,
} from '../actions/project';

const initialState = {
  info: {
    project: null,
    project_name: null,
    scenario_name: null,
    scenarios_list: [],
  },
  isFetching: false,
  error: null,
};

const project = (state = initialState, { type, payload }) => {
  switch (type) {
    case GET_PROJECT:
      return { ...state, ...payload };
    case GET_PROJECT_SUCCESS:
      return { ...state, ...payload };
    case GET_PROJECT_FAILED:
      return { ...state, ...initialState, ...payload };
    case UPDATE_SCENARIO:
      return { ...state, info: { ...state.info, ...payload } };
    default:
      return state;
  }
};

export default project;
