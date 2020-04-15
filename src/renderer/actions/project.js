import axios from 'axios';

export const GET_PROJECT = 'GET_PROJECT';
export const GET_PROJECT_SUCCESS = 'GET_PROJECT_SUCCESS';
export const GET_PROJECT_FAILED = 'GET_PROJECT_FAILED';

export const getProject = () => {
  return (dispatch) => {
    dispatch({
      type: GET_PROJECT,
      payload: { isFetching: true, error: null },
    });
    return axios
      .get(`http://localhost:5050/api/project`)
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
