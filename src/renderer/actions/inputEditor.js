import axios from 'axios';
import inputEndpoints from '../constants/inputEndpoints';
import { httpAction } from '../store/httpMiddleware';

export const RESET_INPUTDATA = 'RESET_INPUTDATA';
export const REQUEST_INPUTDATA = 'REQUEST_INPUTDATA';
export const REQUEST_INPUTDATA_SUCCESS = 'REQUEST_INPUTDATA_SUCCESS';
export const REQUEST_INPUTDATA_FAILED = 'REQUEST_INPUTDATA_FAILED';
export const REQUEST_MAPDATA = 'REQUEST_MAPDATA';
export const RECEIVE_MAPDATA = 'RECEIVE_MAPDATA';
export const SET_SELECTED = 'SET_SELECTED';
export const UPDATE_INPUTDATA = 'UPDATE_INPUTDATA';
export const DELETE_BUILDINGS = 'DELETE_BUILDINGS';
export const DISCARD_INPUTDATA_CHANGES = 'DISCARD_INPUTDATA_CHANGES';

export const resetInputData = () => ({ type: RESET_INPUTDATA });

export const setSelected = selected => ({
  type: SET_SELECTED,
  payload: { selected }
});

export const fetchInputData = () =>
  httpAction({ url: '/inputs/all-inputs', type: REQUEST_INPUTDATA });

export const discardChanges = (callback = () => {}) => dispatch => {
  dispatch(
    httpAction({
      url: '/inputs/all-inputs',
      type: REQUEST_INPUTDATA,
      onSuccess: () => {
        dispatch({ type: DISCARD_INPUTDATA_CHANGES });
        callback();
      }
    })
  );
};

export const updateInputData = (
  table = '',
  buildings = [],
  properties = []
) => ({
  type: UPDATE_INPUTDATA,
  payload: { table, buildings, properties }
});

export const deleteBuildings = (table = '', buildings = []) => ({
  type: DELETE_BUILDINGS,
  payload: { table, buildings }
});

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
