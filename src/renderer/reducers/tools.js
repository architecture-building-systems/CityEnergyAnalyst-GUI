import {
  REQUEST_TOOLLIST,
  RECEIVE_TOOLLIST,
  REQUEST_TOOLPARAMS,
  RECEIVE_TOOLPARAMS,
  SAVING_TOOLPARAMS
} from '../actions/tools';

export const toolList = (
  state = { isFetching: false, error: null, tools: {} },
  { type, payload }
) => {
  switch (type) {
    case REQUEST_TOOLLIST:
      return { ...state, ...payload };
    case RECEIVE_TOOLLIST:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export const toolParams = (
  state = { isFetching: false, error: null, params: {} },
  { type, payload }
) => {
  switch (type) {
    case REQUEST_TOOLPARAMS:
      return { ...state, ...payload };
    case RECEIVE_TOOLPARAMS:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export const toolSaving = (state = { isSaving: false }, { type, payload }) => {
  switch (type) {
    case SAVING_TOOLPARAMS:
      return { ...state, ...payload };
    default:
      return state;
  }
};
