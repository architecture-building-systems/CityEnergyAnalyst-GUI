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
export const SAVE_INPUTDATA = 'SAVE_INPUTDATA';
export const SAVE_INPUTDATA_SUCCESS = 'SAVE_INPUTDATA_SUCCESS';
export const SAVE_INPUTDATA_FAILED = 'SAVE_INPUTDATA_FAILED';
export const DISCARD_INPUTDATA_CHANGES = 'DISCARD_INPUTDATA_CHANGES';

export const resetInputData = () => ({ type: RESET_INPUTDATA });

export const setSelected = selected => ({
  type: SET_SELECTED,
  payload: { selected }
});

export const fetchInputData = () =>
  httpAction({ url: '/inputs/all-inputs', type: REQUEST_INPUTDATA });

export const saveChanges = () => (dispatch, getState) =>
  // eslint-disable-next-line no-undef
  new Promise((resolve, reject) => {
    const { tables, geojsons, crs } = getState().inputData;
    dispatch(
      httpAction({
        url: '/inputs/all-inputs',
        method: 'PUT',
        type: SAVE_INPUTDATA,
        data: { tables, geojsons, crs },
        onSuccess: data => resolve(data),
        onFailure: error => reject(error)
      })
    );
  });

export const discardChanges = () => dispatch =>
  // eslint-disable-next-line no-undef
  new Promise((resolve, reject) => {
    dispatch(
      httpAction({
        url: '/inputs/all-inputs',
        type: REQUEST_INPUTDATA,
        onSuccess: data => {
          dispatch({ type: DISCARD_INPUTDATA_CHANGES });
          resolve(data);
        },
        onFailure: error => reject(error)
      })
    );
  });

export const updateInputData = (
  table = '',
  buildings = [],
  properties = []
) => ({
  type: UPDATE_INPUTDATA,
  payload: { table, buildings, properties }
});

export const deleteBuildings = (buildings = []) => ({
  type: DELETE_BUILDINGS,
  payload: { buildings }
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
