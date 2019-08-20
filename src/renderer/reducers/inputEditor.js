import {
  REQUEST_INPUTDATA,
  RECEIVE_INPUTDATA,
  ERROR_INPUTDATA
} from '../actions/inputEditor';

const inputData = (
  state = { isFetching: false, error: null, data: {} },
  { type, payload }
) => {
  switch (type) {
    case REQUEST_INPUTDATA:
      return { ...state, ...payload };
    case RECEIVE_INPUTDATA:
      return { ...state, ...payload };
    case ERROR_INPUTDATA:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export default inputData;
