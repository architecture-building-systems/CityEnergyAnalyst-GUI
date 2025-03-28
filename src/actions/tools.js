import { apiClient } from '../api/axios';
import { httpAction } from '../store/httpMiddleware';

export const REQUEST_TOOLLIST = 'REQUEST_TOOLLIST';
export const REQUEST_TOOLLIST_SUCCESS = 'REQUEST_TOOLLIST_SUCCESS';
export const REQUEST_TOOLLIST_FAILED = 'REQUEST_TOOLLIST_FAILED';

export const REQUEST_TOOLPARAMS = 'REQUEST_TOOLPARAMS';
export const REQUEST_TOOLPARAMS_SUCCESS = 'REQUEST_TOOLPARAMS_SUCCESS';
export const REQUEST_TOOLPARAMS_FAILED = 'REQUEST_TOOLPARAMS_FAILED';
export const RESET_TOOLPARAMS = 'RESET_TOOLPARAMS';

export const SET_TOOLPARAMS = 'SET_TOOLPARAMS';

export const SAVING_TOOLPARAMS = 'SAVING_TOOLPARAMS';

function shouldFetchToolList(state) {
  const toolList = state.toolList.tools;
  return !Object.keys(toolList).length;
}

export const fetchToolList = () => {
  return (dispatch, getState) => {
    if (shouldFetchToolList(getState())) {
      dispatch(httpAction({ url: `/tools/`, type: REQUEST_TOOLLIST }));
    }
  };
};

export const fetchToolParams = (tool) =>
  httpAction({ url: `/tools/${tool}`, type: REQUEST_TOOLPARAMS });

export const resetToolParams = () => ({ type: RESET_TOOLPARAMS });

export const saveToolParams = (tool, params) => {
  return async (dispatch) => {
    dispatch({
      type: SAVING_TOOLPARAMS,
      payload: { isSaving: true },
    });
    return apiClient
      .post(`/api/tools/${tool}/save-config`, params)
      .then((response) => {
        return response.data;
      })
      .finally(() => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: { isSaving: false },
        });
      });
  };
};

export const setDefaultToolParams = (tool) => {
  return async (dispatch) => {
    // Set config to default and retrieve new config
    dispatch({
      type: SAVING_TOOLPARAMS,
      payload: { isSaving: true },
    });
    return apiClient
      .post(`/api/tools/${tool}/default`)
      .then((response) => {
        dispatch(fetchToolParams(tool));
        return response.data;
      })
      .finally(() => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: { isSaving: false },
        });
      });
  };
};
