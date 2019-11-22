import axios from 'axios';
import inputEndpoints from '../constants/inputEndpoints';
import { httpAction } from '../store/httpMiddleware';

export const RESET_INPUTDATA = 'RESET_INPUTDATA';
export const REQUEST_INPUTDATA = 'REQUEST_INPUTDATA';
export const REQUEST_INPUTDATA_SUCCESS = 'REQUEST_INPUTDATA_SUCCESS';
export const REQUEST_INPUTDATA_FAILED = 'REQUEST_INPUTDATA_FAILED';
export const REQUEST_BUILDINGSCHEDULE = 'REQUEST_BUILDINGSCHEDULE';
export const REQUEST_BUILDINGSCHEDULE_SUCCESS =
  'REQUEST_BUILDINGSCHEDULE_SUCCESS';
export const REQUEST_BUILDINGSCHEDULE_FAILED =
  'REQUEST_BUILDINGSCHEDULE_FAILED';
export const REQUEST_MAPDATA = 'REQUEST_MAPDATA';
export const RECEIVE_MAPDATA = 'RECEIVE_MAPDATA';
export const SET_SELECTED = 'SET_SELECTED';
export const UPDATE_INPUTDATA = 'UPDATE_INPUTDATA';
export const UPDATE_YEARSCHEDULE = 'UPDATE_YEARSCHEDULE';
export const UPDATE_DAYSCHEDULE = 'UPDATE_DAYSCHEDULE';
export const DELETE_BUILDINGS = 'DELETE_BUILDINGS';
export const SAVE_INPUTDATA = 'SAVE_INPUTDATA';
export const SAVE_INPUTDATA_SUCCESS = 'SAVE_INPUTDATA_SUCCESS';
export const SAVE_INPUTDATA_FAILED = 'SAVE_INPUTDATA_FAILED';
export const DISCARD_INPUTDATA_CHANGES = 'DISCARD_INPUTDATA_CHANGES';
export const DISCARD_INPUTDATA_CHANGES_SUCCESS =
  'DISCARD_INPUTDATA_CHANGES_SUCCESS';
export const DISCARD_INPUTDATA_CHANGES_FAILED =
  'DISCARD_INPUTDATA_CHANGES_FAILED';

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
    const { tables, geojsons, crs, schedules } = getState().inputData;
    dispatch(
      httpAction({
        url: '/inputs/all-inputs',
        method: 'PUT',
        type: SAVE_INPUTDATA,
        data: { tables, geojsons, crs, schedules },
        onSuccess: data => resolve(data),
        onFailure: error => reject(error)
      })
    );
  });

export const fetchBuildingSchedule = (buildings, fetchAll = false) => (
  dispatch,
  getState
) => {
  const toFetch = fetchAll
    ? buildings
    : buildings.filter(
        building =>
          !Object.keys(getState().inputData.schedules).includes(building)
      );
  if (toFetch.length) {
    dispatch({ type: REQUEST_BUILDINGSCHEDULE });
    let errors = {};
    const promises = toFetch.map(building =>
      axios
        .get(`http://localhost:5050/api/inputs/building-schedule/${building}`)
        .then(resp => {
          return { [building]: resp.data };
        })
        .catch(error => {
          errors[building] = error.response.data;
        })
    );
    // eslint-disable-next-line no-undef
    return Promise.all(promises).then(values => {
      if (Object.keys(errors).length) {
        throw errors;
      } else {
        let out = {};
        for (const schedule of values) {
          const building = Object.keys(schedule)[0];
          out[building] = schedule[building];
        }
        dispatch({
          type: REQUEST_BUILDINGSCHEDULE_SUCCESS,
          payload: out
        });
      }
    });
  }
  // eslint-disable-next-line no-undef
  return Promise.resolve();
};

export const discardChanges = () => (dispatch, getState) =>
  // eslint-disable-next-line no-undef
  Promise.all([
    // eslint-disable-next-line no-undef
    new Promise((resolve, reject) => {
      dispatch(
        httpAction({
          url: '/inputs/all-inputs',
          type: DISCARD_INPUTDATA_CHANGES,
          onSuccess: data => resolve(data),
          onFailure: error => reject(error)
        })
      );
    }),
    fetchBuildingSchedule(Object.keys(getState().inputData.schedules), true)(
      dispatch,
      getState
    )
  ]);

export const updateInputData = (
  table = '',
  buildings = [],
  properties = []
) => ({
  type: UPDATE_INPUTDATA,
  payload: { table, buildings, properties }
});

export const updateYearSchedule = (buildings = [], month = '', value = 0) => ({
  type: UPDATE_YEARSCHEDULE,
  payload: { buildings, month, value }
});

export const updateDaySchedule = (
  buildings = [],
  tab = '',
  day = '',
  hour = 0,
  value = ''
) => ({
  type: UPDATE_DAYSCHEDULE,
  payload: { buildings, tab, day, hour, value }
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
