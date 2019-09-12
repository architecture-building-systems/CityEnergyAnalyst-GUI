import axios from 'axios';
import inputEndpoints from '../constants/inputEndpoints';

export const RESET_INPUTDATA = 'RESET_INPUTDATA';
export const REQUEST_INPUTDATA = 'REQUEST_INPUTDATA';
export const RECEIVE_INPUTDATA = 'RECEIVE_INPUTDATA';
export const REQUEST_MAPDATA = 'REQUEST_MAPDATA';
export const RECEIVE_MAPDATA = 'RECEIVE_MAPDATA';
export const SET_SELECTED = 'SET_SELECTED';

export const resetInputData = () => ({
  type: RESET_INPUTDATA
});

export const setSelected = selected => ({
  type: SET_SELECTED,
  payload: { selected }
});

export const fetchInputData = () => {
  return dispatch => {
    dispatch({
      type: REQUEST_INPUTDATA,
      payload: { isFetchingInputData: true, error: null }
    });
    return axios
      .get('http://localhost:5050/api/inputs/all-inputs')
      .then(response => {
        dispatch({
          type: RECEIVE_INPUTDATA,
          payload: { ...response.data, isFetchingInputData: false }
        });
        return response.data;
      })
      .catch(error => {
        const message =
          typeof error.code === 'undefined'
            ? error.message
            : error.data.message;
        dispatch({
          type: RECEIVE_INPUTDATA,
          payload: {
            error: message,
            isFetchingInputData: false
          }
        });
      });
  };
};

export const fetchMapData = () => {
  const layerList = Object.keys(inputEndpoints);
  return dispatch => {
    dispatch({
      type: REQUEST_MAPDATA,
      payload: { isFetchingMapData: true, error: null }
    });

    let promises = layerList.map(type =>
      axios.get(inputEndpoints[type]).catch(error => {
        console.log(error.response.data);
      })
    );
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
          type: RECEIVE_MAPDATA,
          payload: { geojsons: data, isFetchingMapData: false }
        });
      })
      .catch(error => console.log(error));
  };
};
