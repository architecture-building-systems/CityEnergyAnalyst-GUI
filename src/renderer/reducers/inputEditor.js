import {
  REQUEST_INPUTDATA,
  RECEIVE_INPUTDATA,
  REQUEST_MAPDATA,
  RECEIVE_MAPDATA
} from '../actions/inputEditor';

const inputData = (
  state = { isFetchingInputData: false, isFetchingMapData: false, error: null },
  { type, payload }
) => {
  switch (type) {
    case REQUEST_INPUTDATA:
      return { ...payload };
    case RECEIVE_INPUTDATA:
      return { ...state, ...payload };
    case REQUEST_MAPDATA:
      return { ...state, ...payload };
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    default:
      return state;
  }
};

export default inputData;
