import axios from 'axios';

export const REQUEST_INPUTDATA = 'REQUEST_INPUTDATA';
export const RECEIVE_INPUTDATA = 'RECEIVE_INPUTDATA';

export const fetchInputData = () => {
  return dispatch => {
    dispatch({
      type: REQUEST_INPUTDATA,
      payload: { isFetching: true, error: null }
    });
    return axios
      .get('http://localhost:5050/api/inputs/building-properties')
      .then(response => {
        dispatch({
          type: RECEIVE_INPUTDATA,
          payload: { data: response.data, isFetching: false }
        });
        return response.data;
      })
      .catch(error => {
        dispatch({
          type: RECEIVE_INPUTDATA,
          payload: {
            error: { message: error.response.data.message },
            isFetching: false
          }
        });
      });
  };
};
