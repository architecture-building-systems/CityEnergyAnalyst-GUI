import axios from 'axios';
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
      payload: { isSaving: true, error: null },
    });
    return axios
      .post(
        `${import.meta.env.VITE_CEA_URL}/api/tools/${tool}/save-config`,
        params,
      )
      .then((response) => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: { isSaving: false },
        });
        return response.data;
      })
      .catch((error) => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: {
            error: {
              message: error?.response?.data?.message ?? error?.message,
            },
            isSaving: false,
          },
        });
      });
  };
};

export const setDefaultToolParams = (tool) => {
  return async (dispatch) => {
    dispatch({
      type: SAVING_TOOLPARAMS,
      payload: { isSaving: true, error: null },
    });
    return axios
      .post(`${import.meta.env.VITE_CEA_URL}/api/tools/${tool}/default`)
      .then((response) => {
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: { isSaving: false },
        });
        dispatch(fetchToolParams(tool));
        return response.data;
      })
      .catch((error) => {
        console.log(error);
        dispatch({
          type: SAVING_TOOLPARAMS,
          payload: {
            error: {
              message: error?.response?.data?.message ?? error?.message,
            },
            isSaving: false,
          },
        });
      });
  };
};
