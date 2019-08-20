import axios from 'axios';
import inputEndpoints from '../constants/inputEndpoints';

export const REQUEST_INPUTDATA = 'REQUEST_INPUTDATA';
export const RECEIVE_INPUTDATA = 'RECEIVE_INPUTDATA';
export const ERROR_INPUTDATA = 'ERROR_INPUTDATA';

function shouldFetchInputData(state) {
  const data = state.inputData.data;
  return !Object.keys(data).length;
}

export const fetchInputData = layerList => {
  return (_dispatch, getState) => {
    if (shouldFetchInputData(getState())) {
      return _dispatch(dispatch => {
        dispatch({
          type: REQUEST_INPUTDATA,
          payload: { isFetching: true, error: null }
        });
        let promises = layerList.map(async type => {
          try {
            return axios.get(inputEndpoints[type]);
          } catch (error) {
            dispatch({
              type: ERROR_INPUTDATA,
              payload: {
                error: { message: error }
              }
            });
          }
        });
        return axios
          .all(promises)
          .then(results => {
            let data = {};
            for (var i = 0; i < layerList.length; i++) {
              if (results[i] && results[i].status === 200) {
                data[layerList[i]] = results[i].data;
              }
            }
            dispatch({
              type: RECEIVE_INPUTDATA,
              payload: { data, isFetching: false }
            });
          })
          .catch(error => console.log(error));
      });
    }
  };
};
