import {
  REQUEST_INPUTDATA,
  REQUEST_INPUTDATA_SUCCESS,
  REQUEST_INPUTDATA_FAILED,
  REQUEST_MAPDATA,
  RECEIVE_MAPDATA,
  RESET_INPUTDATA,
  SET_SELECTED,
  UPDATE_INPUTDATA,
  DELETE_BUILDINGS,
  DISCARD_INPUTDATA_CHANGES
} from '../actions/inputEditor';

const initialState = {
  selected: [],
  changes: { update: {}, delete: {} },
  error: null,
  status: ''
};

const buildingGeometries = ['zone', 'district'];

function updateData(state, table, buildings, properties) {
  let { geojsons, tables } = state;
  for (const building of buildings) {
    for (const property of properties) {
      tables[table][building][property.property] = property.value;
      // Update building properties of geojsons
      if (buildingGeometries.includes(table)) {
        geojsons = updateGeoJsonProperty(geojsons, table, building, property);
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
      [property.property]: Number(property.value)
    };
  return {
    ...geojsons,
    [table]: { ...geojsons[table], features: geojsons[table].features }
  };
}

function deleteBuildings(state, table, buildings) {
  let { geojsons, tables } = state;
  for (const building of buildings) {
    if (table != 'district') {
      // Delete building from every table that is not district
      for (const _table in tables) {
        if (_table != 'district') {
          delete tables[_table][building];
          tables = { ...tables, [_table]: { ...tables[_table] } };
        }
      }
      // Delete building from zone geojson
      geojsons = deleteGeoJsonFeature(geojsons, 'zone', building);
    } else {
      delete tables[table][building];
      geojsons = deleteGeoJsonFeature(geojsons, 'district', building);
    }
  }
  return { geojsons, tables };
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

const inputData = (state = initialState, { type, payload }) => {
  switch (type) {
    case REQUEST_INPUTDATA:
      return { ...state, status: 'fetching', error: null };
    case REQUEST_INPUTDATA_SUCCESS:
      return { ...state, ...payload, status: 'received' };
    case REQUEST_INPUTDATA_FAILED:
      return { ...state, status: 'failed', error: payload };
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
    case DELETE_BUILDINGS:
      return {
        ...state,
        ...deleteBuildings(state, payload.table, payload.buildings)
      };
    case SET_SELECTED:
    case REQUEST_MAPDATA:
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    case DISCARD_INPUTDATA_CHANGES:
      return { ...state, changes: initialState.changes };
    case RESET_INPUTDATA:
      return initialState;
    default:
      return state;
  }
};

export default inputData;
