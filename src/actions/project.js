import axios from 'axios';

export const GET_PROJECT = 'GET_PROJECT';
export const GET_PROJECT_SUCCESS = 'GET_PROJECT_SUCCESS';
export const GET_PROJECT_FAILED = 'GET_PROJECT_FAILED';

export const getProject = (project = null) => {
  return (dispatch) => {
    dispatch({
      type: GET_PROJECT,
      payload: { isFetching: true, error: null },
    });
    const config = project ? { params: { project } } : {};
    return axios
      .get(`${import.meta.env.VITE_CEA_URL}/api/project/`, config)
      .then((response) => {
        dispatch({
          type: GET_PROJECT_SUCCESS,
          payload: { isFetching: false, info: response.data },
        });
        return response.data;
      })
      .catch((error) => {
        dispatch({
          type: GET_PROJECT_FAILED,
          payload: { isFetching: false, error },
        });
      });
  };
};

export const UPDATE_SCENARIO = 'UPDATE_SCENARIO';

export const updateScenario = (scenarioName) => ({
  type: UPDATE_SCENARIO,
  payload: { scenario_name: scenarioName },
});
