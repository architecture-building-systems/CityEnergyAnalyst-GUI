import {
  FETCH_JOBS_SUCCESS,
  FETCH_JOBS_FAILED,
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILED,
  START_JOB_SUCCESS,
  START_JOB_FAILED,
  UPDATE_JOB,
  DISMISS_JOB,
  DELETED_JOB_FAILED,
  DELETED_JOB_SUCCESS,
} from '../actions/jobs';

const initialState = null;

const transformInitialPayload = (payload) => {
  const out = {};
  payload.forEach((job) => {
    const { id, ...props } = job;
    out[id] = props;
  });
  return out;
};

const transformJobPayload = (payload) => {
  const { id, ...props } = payload;
  return { [id]: { ...props } };
};

const jobs = (state = initialState, { type, payload }) => {
  switch (type) {
    case FETCH_JOBS_SUCCESS:
      return transformInitialPayload(payload);
    case CREATE_JOB_SUCCESS:
    case UPDATE_JOB:
      console.debug(payload);
      return { ...state, ...transformJobPayload(payload) };
    case DISMISS_JOB:
      console.debug(payload);
      return { ...state, ...transformJobPayload(payload) };
    case DELETED_JOB_SUCCESS:
      console.debug(payload);
      delete state[payload];
      return { ...state };
    case FETCH_JOBS_FAILED:
    case CREATE_JOB_FAILED:
    case START_JOB_SUCCESS:
    case START_JOB_FAILED:
    case DELETED_JOB_FAILED:
      console.debug(payload);
      return state;
    default:
      return state;
  }
};

export default jobs;
