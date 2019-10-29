import {
  REQUEST_INPUTDATA,
  REQUEST_INPUTDATA_SUCCESS,
  REQUEST_INPUTDATA_FAILED,
  REQUEST_MAPDATA,
  RECEIVE_MAPDATA,
  RESET_INPUTDATA,
  SET_SELECTED,
  UPDATE_INPUTDATA
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
  const buildingIndex = geojsons[table].features.findIndex(
    feature => feature.properties.Name == building
  );
  geojsons[table].features[buildingIndex].properties = {
    ...geojsons[table].features[buildingIndex].properties,
    [property.property]: Number(property.value)
  };
  return {
    ...geojsons,
    [table]: { ...geojsons[table], features: geojsons[table].features }
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
    case UPDATE_INPUTDATA: {
      return {
        ...state,
        ...updateData(
          state,
          payload.table,
          payload.buildings,
          payload.properties
        )
      };
    }
    case SET_SELECTED:
    case REQUEST_MAPDATA:
    case RECEIVE_MAPDATA:
      return { ...state, ...payload };
    case RESET_INPUTDATA:
      return initialState;
    default:
      return state;
  }
};

export default inputData;
