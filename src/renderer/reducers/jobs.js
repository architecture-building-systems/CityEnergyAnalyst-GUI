import {
  FETCH_JOBS_SUCCESS,
  FETCH_JOBS_FAILED,
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILED,
  START_JOB_SUCCESS,
  START_JOB_FAILED,
  UPDATE_JOB,
  DISMISS_JOB,
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
      console.log(payload);
      return { ...state, ...transformJobPayload(payload) };
    case DISMISS_JOB:
      console.log(payload);
      return { ...state, ...transformJobPayload(payload) };
    case FETCH_JOBS_FAILED:
    case CREATE_JOB_FAILED:
    case START_JOB_SUCCESS:
    case START_JOB_FAILED:
      console.log(payload);
      return state;
    default:
      return state;
  }
};

export default jobs;
