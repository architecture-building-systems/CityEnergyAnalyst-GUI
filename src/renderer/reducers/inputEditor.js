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

function createNestedProp(obj, prop, ...rest) {
  if (typeof obj[prop] == 'undefined') {
    obj[prop] = {};
    if (rest.length === 0) return false;
  }
  if (rest.length === 0) return true;
  return createNestedProp(obj[prop], ...rest);
}

function updateData(state, table, buildings, properties) {
  let { geojsons, tables, changes } = state;
  for (const building of buildings) {
    for (const _property of properties) {
      const { property, value } = _property;
      // Track update changes
      if (
        createNestedProp(changes.update, table, building, property, 'oldValue')
      ) {
        // Delete update if newValue equals oldValue else update newValue
        if (changes.update[table][building][property].oldValue == value) {
          delete changes.update[table][building][property];
          // Delete update building entry if it is empty
          if (!Object.keys(changes.update[table][building]).length) {
            delete changes.update[table][building];
            if (!Object.keys(changes.update[table]).length)
              delete changes.update[table];
          }
        } else changes.update[table][building][property].newValue = value;
      } else {
        // Store old and new value
        changes.update[table][building][property] = {
          oldValue: tables[table][building][property],
          newValue: value
        };
      }

      tables = {
        ...tables,
        [table]: {
          ...tables[table],
          [building]: {
            ...tables[table][building],
            [property]: value
          }
        }
      };

      // Update building properties of geojsons
      if (buildingGeometries.includes(table)) {
        geojsons = updateGeoJsonProperty(geojsons, table, building, _property);
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

function deleteBuildings(state, buildings) {
  let { geojsons, tables, changes } = state;
  const isZoneBuilding = !!tables.zone[buildings[0]];

  // Track delete changes
  const layer = isZoneBuilding ? 'zone' : 'district';
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
      // Delete building from every table that is not district
      for (const table in tables) {
        if (table != 'district') {
          delete tables[table][building];
          tables = { ...tables, [table]: { ...tables[table] } };
        }
      }
      // Delete building from zone geojson
      geojsons = deleteGeoJsonFeature(geojsons, 'zone', building);
    } else {
      delete tables.district[building];
      geojsons = deleteGeoJsonFeature(geojsons, 'district', building);
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
        selected: initialState.selected,
        ...deleteBuildings(state, payload.buildings)
      };
    case SET_SELECTED:
    case REQUEST_MAPDATA:
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    case DISCARD_INPUTDATA_CHANGES:
      return { ...state, changes: { update: {}, delete: {} } };
    case RESET_INPUTDATA:
      return { ...initialState, changes: { update: {}, delete: {} } };
    default:
      return state;
  }
};

export default inputData;
