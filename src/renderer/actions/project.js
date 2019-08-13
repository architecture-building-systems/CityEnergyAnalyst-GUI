import axios from 'axios';

export const GET_PROJECT = 'GET_PROJECT';

export const getProject = () => {
  return dispatch => {
    return axios
      .get(`http://localhost:5000/api/project`)
      .then(response => {
        dispatch({
          type: GET_PROJECT,
          payload: response.data
        });
        return response.data;
      })
      .catch(error => {
        dispatch({
          type: GET_PROJECT,
          payload: {
            error
          }
        });
      });
  };
};
