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
      return { ...state, ...check_scenario_list_for_emtpy(payload) };
    case GET_PROJECT_FAILED:
      return { ...state, ...initialState, ...payload };
    case UPDATE_SCENARIO:
      return { ...state, info: { ...state.info, ...payload } };
    default:
      return state;
  }
};

const check_scenario_list_for_emtpy = (payload) => {
  const { info, ...rest_of_payload } = payload;
  const { scenarios_list, ...rest_of_info } = info;
  console.log(payload);
  console.log(info);
  console.log(scenarios_list);
  if (typeof scenarios_list !== 'undefined' && scenarios_list.length === 0) {
    return {
      ...rest_of_payload,
      info: { ...rest_of_info, scenarios_list, scenario_name: '' },
    };
  }
  return payload;
};

export default project;
