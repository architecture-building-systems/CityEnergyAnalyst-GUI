import {
  REQUEST_INPUTDATA,
  REQUEST_INPUTDATA_SUCCESS,
  REQUEST_INPUTDATA_FAILED,
  REQUEST_MAPDATA,
  RECEIVE_MAPDATA,
  RESET_INPUTDATA,
  SET_SELECTED
} from '../actions/inputEditor';

const initialState = {
  selected: [],
  error: null,
  status: ''
};

const inputData = (state = initialState, { type, payload }) => {
  switch (type) {
    case REQUEST_INPUTDATA:
      return { ...state, status: 'fetching' };
    case REQUEST_INPUTDATA_SUCCESS:
      return { ...state, ...payload, status: 'received' };
    case REQUEST_INPUTDATA_FAILED:
      return { ...state, status: 'failed', error: payload };
    case SET_SELECTED:
    case REQUEST_MAPDATA:
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    case RESET_INPUTDATA:
      return initialState;
    default:
      return state;
  }
};

export default inputData;
