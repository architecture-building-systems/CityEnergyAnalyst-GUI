import {
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILED,
  START_JOB_SUCCESS,
  START_JOB_FAILED,
  UPDATE_JOB
} from '../actions/jobs';

const initialState = {};

const transformPayload = payload => {
  const { id, ...props } = payload;
  return { [id]: { ...props } };
};

const jobs = (state = initialState, { type, payload }) => {
  switch (type) {
    case CREATE_JOB_SUCCESS:
    case UPDATE_JOB:
      console.log(payload);
      return { ...state, ...transformPayload(payload) };
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
