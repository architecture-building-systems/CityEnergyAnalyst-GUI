import axios from 'axios';

export const REQUEST_TOOLLIST = 'REQUEST_TOOLLIST';
export const RECEIVE_TOOLLIST = 'RECEIVE_TOOLLIST';
export const REQUEST_TOOLPARAMS = 'REQUEST_TOOLPARAMS';
export const RECEIVE_TOOLPARAMS = 'RECEIVE_TOOLPARAMS';
export const SET_TOOLPARAMS = 'SET_TOOLPARAMS';
export const SAVING_TOOLPARAMS = 'SAVING_TOOLPARAMS';

function shouldFetchToolList(state) {
  const toolList = state.toolList.tools;
  return !Object.keys(toolList).length;
}

export const fetchToolList = () => {
  return (_dispatch, getState) => {
    if (shouldFetchToolList(getState())) {
      return _dispatch(dispatch => {
        dispatch({
          type: REQUEST_TOOLLIST,
          payload: { isFetching: true, error: null }
        });
        return axios
          .get(`http://localhost:5000/api/tools`)
          .then(response => {
            dispatch({
              type: RECEIVE_TOOLLIST,
              payload: { tools: response.data, isFetching: false }
            });
            return response.data;
          })
          .catch(error => {
            console.log(error);
            dispatch({
              type: RECEIVE_TOOLLIST,
              payload: {
                error: { message: error },
                isFetching: false
              }
            });
          });
      });
    }
  };
};

export const fetchToolParams = tool => {
  return dispatch => {
    dispatch({
      type: REQUEST_TOOLPARAMS,
      payload: { isFetching: true, error: null }
    });
    return axios
      .get(`http://localhost:5000/api/tools/${tool}`)
      .then(response => {
        dispatch({
          type: RECEIVE_TOOLPARAMS,
          payload: { params: response.data, isFetching: false }
        });
        return response.data;
      })
      .catch(error => {
        dispatch({
          type: RECEIVE_TOOLPARAMS,
          payload: {
            error: { message: error.response.data },
            isFetching: false
          }
        });
      });
  };
};

export const saveToolParams = (tool, params) => {
  return dispatch => {
    dispatch({
      type: SAVING_TOOLPARAMS,
      payload: { isSaving: true, error: null }
    });
    return axios
      .post(`http://localhost:5000/api/tools/${tool}/save-config`, params)
      .then(response => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: { isSaving: false }
        });
        return response.data;
      })
      .catch(error => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: {
            error: { message: error.response.data.message },
            isSaving: false
          }
        });
      });
  };
};

export const setDefaultToolParams = tool => {
  return dispatch => {
    dispatch({
      type: SAVING_TOOLPARAMS,
      payload: { isSaving: true, error: null }
    });
    return axios
      .post(`http://localhost:5000/api/tools/${tool}/default`)
      .then(response => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: { isSaving: false }
        });
        dispatch(fetchToolParams(tool));
        return response.data;
      })
      .catch(error => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: {
            error: { message: error.response.data.message },
            isSaving: false
          }
        });
      });
  };
};
