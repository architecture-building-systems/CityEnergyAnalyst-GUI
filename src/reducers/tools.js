import {
  REQUEST_TOOLLIST,
  REQUEST_TOOLLIST_SUCCESS,
  REQUEST_TOOLLIST_FAILED,
  REQUEST_TOOLPARAMS,
  REQUEST_TOOLPARAMS_SUCCESS,
  REQUEST_TOOLPARAMS_FAILED,
  RESET_TOOLPARAMS,
  SAVING_TOOLPARAMS,
} from '../actions/tools';

export const toolList = (
  state = { status: '', error: null, tools: {} },
  { type, payload },
) => {
  switch (type) {
    case REQUEST_TOOLLIST:
      return { ...state, status: 'fetching', error: null };
    case REQUEST_TOOLLIST_SUCCESS:
      return { ...state, ...state, tools: payload, status: 'received' };
    case REQUEST_TOOLLIST_FAILED:
      return { ...state, status: 'failed', error: payload };
    default:
      return state;
  }
};

export const toolParams = (
  state = { status: '', error: null, params: {} },
  { type, payload },
) => {
  switch (type) {
    case REQUEST_TOOLPARAMS:
      return { ...state, status: 'fetching', error: null };
    case REQUEST_TOOLPARAMS_SUCCESS:
      return { ...state, params: payload, status: 'received' };
    case REQUEST_TOOLPARAMS_FAILED:
      return { ...state, status: 'failed', error: payload };
    case RESET_TOOLPARAMS:
      return { status: '', error: null, params: {} };
    default:
      return state;
  }
};

export const toolSaving = (
  state = { isSaving: false, error: null },
  { type, payload },
) => {
  switch (type) {
    case SAVING_TOOLPARAMS:
      return { ...state, ...payload };
    default:
      return state;
  }
};
