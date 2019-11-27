import {
  REQUEST_INPUTDATA,
  REQUEST_INPUTDATA_SUCCESS,
  REQUEST_INPUTDATA_FAILED,
  REQUEST_BUILDINGSCHEDULE_SUCCESS,
  REQUEST_BUILDINGSCHEDULE_FAILED,
  REQUEST_MAPDATA,
  RECEIVE_MAPDATA,
  RESET_INPUTDATA,
  SET_SELECTED,
  UPDATE_INPUTDATA,
  UPDATE_YEARSCHEDULE,
  UPDATE_DAYSCHEDULE,
  DELETE_BUILDINGS,
  SAVE_INPUTDATA_SUCCESS,
  DISCARD_INPUTDATA_CHANGES_SUCCESS
} from '../actions/inputEditor';
import { months_short } from '../constants/months';

const initialState = {
  selected: [],
  changes: { update: {}, delete: {} },
  error: null,
  status: ''
};

const buildingGeometries = ['zone', 'surroundings'];

function createNestedProp(obj, prop, ...rest) {
  if (typeof obj[prop] == 'undefined') {
    obj[prop] = {};
    if (rest.length === 0) return false;
  }
  if (rest.length === 0) return true;
  return createNestedProp(obj[prop], ...rest);
}

function updateChanges(
  changes,
  table,
  building,
  property,
  storedValue,
  newValue
) {
  if (createNestedProp(changes.update, table, building, property, 'oldValue')) {
    // Delete update if newValue equals oldValue else update newValue
    if (changes.update[table][building][property].oldValue == newValue) {
      delete changes.update[table][building][property];
      // Delete update building entry if it is empty
      if (!Object.keys(changes.update[table][building]).length) {
        delete changes.update[table][building];
        if (!Object.keys(changes.update[table]).length)
          delete changes.update[table];
      }
    } else changes.update[table][building][property].newValue = newValue;
  } else {
    // Store old and new value
    changes.update[table][building][property] = {
      oldValue: storedValue,
      newValue: newValue
    };
  }
}

function updateData(state, table, buildings, properties) {
  let { geojsons, tables, changes } = state;
  for (const building of buildings) {
    for (const propertyObj of properties) {
      const { property, value } = propertyObj;
      // Track update changes
      updateChanges(
        changes,
        table,
        building,
        property,
        tables[table][building][property],
        value
      );

      tables = {
        ...tables,
        [table]: {
          ...tables[table],
          [building]: {
            ...tables[table][building],
            [property]: value,
            ...(tables[table][building].REFERENCE
              ? { REFERENCE: 'User - Input' }
              : {})
          }
        }
      };

      // Update building properties of geojsons
      if (buildingGeometries.includes(table)) {
        geojsons = updateGeoJsonProperty(
          geojsons,
          table,
          building,
          propertyObj
        );
      }
    }
  }
  return { geojsons, tables };
}

function updateGeoJsonProperty(geojsons, table, building, property) {
  const _building = geojsons[table].features.find(
    feature => feature.properties.Name == building
  );
  if (_building)
    _building.properties = {
      ..._building.properties,
      [property.property]: Number(property.value),
      ...(_building.properties.REFERENCE ? { REFERENCE: 'User - Input' } : {})
    };
  return {
    ...geojsons,
    [table]: { ...geojsons[table], features: geojsons[table].features }
  };
}

function deleteBuildings(state, buildings) {
  let { geojsons, tables, changes } = state;
  const isZoneBuilding = !!tables.zone[buildings[0]];

  // Track delete changes
  const layer = isZoneBuilding ? 'zone' : 'surroundings';
  changes.delete[layer] = changes.delete[layer] || [];
  changes.delete[layer].push(...buildings);

  for (const building of buildings) {
    // Remove deleted buildings from update changes
    for (const table in changes.update) {
      delete changes.update[table][building];
      if (!Object.keys(changes.update[table]).length)
        delete changes.update[table];
    }

    if (isZoneBuilding) {
      // Delete building from every table that is not surroundings
      for (const table in tables) {
        if (table != 'surroundings') {
          delete tables[table][building];
          tables = { ...tables, [table]: { ...tables[table] } };
        }
      }
      // Delete building from zone geojson
      geojsons = deleteGeoJsonFeature(geojsons, 'zone', building);
    } else {
      delete tables.surroundings[building];
      geojsons = deleteGeoJsonFeature(geojsons, 'surroundings', building);
    }
  }
  return { geojsons, tables, changes };
}

function deleteGeoJsonFeature(geojsons, table, building) {
  return {
    ...geojsons,
    [table]: {
      ...geojsons[table],
      features: geojsons[table].features.filter(
        feature => feature.properties.Name != building
      )
    }
  };
}

function updateDaySchedule(state, buildings, tab, day, hour, value) {
  let { schedules, changes } = state;
  for (const building of buildings) {
    // Track update changes
    updateChanges(
      changes,
      'schedules',
      building,
      `${tab}_${day}_${hour + 1}`,
      schedules[building].SCHEDULES[tab][day][hour],
      value
    );

    let daySchedule = schedules[building].SCHEDULES[tab][day];
    daySchedule[hour] = value;
    schedules = {
      ...schedules,
      [building]: {
        ...schedules[building],
        SCHEDULES: {
          ...schedules[building].SCHEDULES,
          [tab]: {
            ...schedules[building].SCHEDULES[tab],
            [day]: daySchedule
          }
        }
      }
    };
  }
  return { schedules };
}

function updateYearSchedule(state, buildings, month, value) {
  let { schedules, changes } = state;
  for (const building of buildings) {
    // Track update changes
    updateChanges(
      changes,
      'schedules',
      building,
      `MONTHLY_MULTIPLIER_${months_short[month]}`,
      schedules[building].MONTHLY_MULTIPLIER[month],
      value
    );

    let monthSchedule = schedules[building].MONTHLY_MULTIPLIER;
    monthSchedule[month] = value;
    schedules = {
      ...schedules,
      [building]: {
        ...schedules[building],
        MONTHLY_MULTIPLIER: monthSchedule
      }
    };
  }
  return { schedules };
}

const inputData = (state = initialState, { type, payload }) => {
  switch (type) {
    case REQUEST_INPUTDATA:
      return { ...state, status: 'fetching', error: null };
    case REQUEST_INPUTDATA_SUCCESS:
      return { ...state, ...payload, status: 'received' };
    case REQUEST_INPUTDATA_FAILED:
      return { ...state, status: 'failed', error: payload };
    case REQUEST_BUILDINGSCHEDULE_SUCCESS:
      return { ...state, schedules: { ...state.schedules, ...payload } };
    case UPDATE_INPUTDATA:
      return {
        ...state,
        ...updateData(
          state,
          payload.table,
          payload.buildings,
          payload.properties
        )
      };
    case UPDATE_YEARSCHEDULE:
      return {
        ...state,
        ...updateYearSchedule(
          state,
          payload.buildings,
          payload.month,
          payload.value
        )
      };
    case UPDATE_DAYSCHEDULE:
      return {
        ...state,
        ...updateDaySchedule(
          state,
          payload.buildings,
          payload.tab,
          payload.day,
          payload.hour,
          payload.value
        )
      };
    case DELETE_BUILDINGS:
      return {
        ...state,
        selected: initialState.selected,
        ...deleteBuildings(state, payload.buildings)
      };
    case SET_SELECTED:
    case REQUEST_MAPDATA:
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    case DISCARD_INPUTDATA_CHANGES_SUCCESS:
      return { ...state, ...payload, changes: { update: {}, delete: {} } };
    case SAVE_INPUTDATA_SUCCESS:
      return { ...state, changes: { update: {}, delete: {} } };
    case RESET_INPUTDATA:
      return { ...initialState, changes: { update: {}, delete: {} } };
    default:
      return state;
  }
};

export default inputData;
