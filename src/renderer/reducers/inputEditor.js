import {
  REQUEST_INPUTDATA,
  RECEIVE_INPUTDATA,
  REQUEST_MAPDATA,
  RECEIVE_MAPDATA,
  RESET_INPUTDATA,
  SET_SELECTED
} from '../actions/inputEditor';

const initialState = {
  isFetchingInputData: false,
  isFetchingMapData: false,
  error: null
};

const inputData = (state = initialState, { type, payload }) => {
  switch (type) {
    case REQUEST_INPUTDATA:
      return { ...payload, selected: [] };
    case RECEIVE_INPUTDATA:
      return { ...state, ...payload };
    case REQUEST_MAPDATA:
      return { ...state, ...payload };
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    case RESET_INPUTDATA:
      return initialState;
    case SET_SELECTED:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export default inputData;
