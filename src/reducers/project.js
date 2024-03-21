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
      return { ...state, ...check_scenario_list(payload) };
    case GET_PROJECT_FAILED:
      return { ...state, ...initialState, ...payload };
    case UPDATE_SCENARIO:
      return { ...state, info: { ...state.info, ...payload } };
    default:
      return state;
  }
};

const check_scenario_list = (payload) => {
  const {
    info: { scenarios_list, scenario_name },
  } = payload;
  // Set scenario name to null if project is empty or scenario does not exist
  if (scenarios_list.length === 0 || !scenarios_list.includes(scenario_name)) {
    return {
      ...payload,
      info: { ...payload.info, scenario_name: null },
    };
  }
  return payload;
};

export default project;
