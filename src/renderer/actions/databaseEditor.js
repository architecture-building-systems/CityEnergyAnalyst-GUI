import axios from 'axios';

export const INIT_DATABASE_STATE = 'INIT_DATABASE_STATE';
export const INIT_DATABASE_STATE_SUCCESS = 'INIT_DATABASE_STATE_SUCCESS';
export const initDatabaseState = () => async (dispatch, getState) => {
  dispatch({ type: INIT_DATABASE_STATE });
  // eslint-disable-next-line
  return Promise.all([
    dispatch(fetchDatabaseData('all')),
    dispatch(fetchDatabaseSchema('all')),
    dispatch(fetchDatabaseGlossary())
  ]).then(() => {
    const { status } = getState().databaseEditor.status;
    if (status !== 'failed')
      return dispatch({ type: INIT_DATABASE_STATE_SUCCESS });
  });
};

export const FETCH_DATABASE_DATA = 'FETCH_DATABASE_DATA';
export const FETCH_DATABASE_DATA_SUCCESS = 'FETCH_DATABASE_DATA_SUCCESS';
export const FETCH_DATABASE_DATA_FAILURE = 'FETCH_DATABASE_DATA_FAILURE';
export const fetchDatabaseData = db => async dispatch => {
  try {
    dispatch({ type: FETCH_DATABASE_DATA });
    const { data } = await axios.get(
      `http://localhost:5050/api/inputs/databases/${db}`
    );
    return dispatch({
      type: FETCH_DATABASE_DATA_SUCCESS,
      payload: data
    });
  } catch (err) {
    return dispatch({
      type: FETCH_DATABASE_DATA_FAILURE,
      payload: err.response || err
    });
  }
};

export const FETCH_DATABASE_SCHEMA = 'FETCH_DATABASE_SCHEMA';
export const FETCH_DATABASE_SCHEMA_SUCCESS = 'FETCH_DATABASE_SCHEMA_SUCCESS';
export const FETCH_DATABASE_SCHEMA_FAILURE = 'FETCH_DATABASE_SCHEMA_FAILURE';
export const fetchDatabaseSchema = db => async dispatch => {
  try {
    dispatch({ type: FETCH_DATABASE_SCHEMA });
    const { data } = await axios.get(
      `http://localhost:5050/api/databases/schema/${db}`
    );
    return dispatch({
      type: FETCH_DATABASE_SCHEMA_SUCCESS,
      payload: data
    });
  } catch (err) {
    return dispatch({
      type: FETCH_DATABASE_SCHEMA_FAILURE,
      payload: err.response || err
    });
  }
};

export const FETCH_DATABASE_GLOSSARY = 'FETCH_DATABASE_GLOSSARY';
export const FETCH_DATABASE_GLOSSARY_SUCCESS =
  'FETCH_DATABASE_GLOSSARY_SUCCESS';
export const FETCH_DATABASE_GLOSSARY_FAILURE =
  'FETCH_DATABASE_GLOSSARY_FAILURE';
export const fetchDatabaseGlossary = () => async dispatch => {
  try {
    dispatch({ type: FETCH_DATABASE_GLOSSARY });
    const { data } = await axios.get(`http://localhost:5050/api/glossary`);
    return dispatch({
      type: FETCH_DATABASE_GLOSSARY_SUCCESS,
      payload: data
    });
  } catch (err) {
    return dispatch({
      type: FETCH_DATABASE_GLOSSARY_FAILURE,
      payload: err.response || err
    });
  }
};

export const COPY_SCHEDULE_DATA = 'COPY_SCHEDULE_DATA';
export const copyScheduleData = (name, copy) => ({
  type: COPY_SCHEDULE_DATA,
  payload: { name, copy }
});

export const UPDATE_DATABASE_VALIDATION = 'UPDATE_DATABASE_VALIDATION';
export const updateDatabaseValidation = validation => ({
  type: UPDATE_DATABASE_VALIDATION,
  payload: validation
});

export const UPDATE_DATABASE_CHANGES = 'UPDATE_DATABASE_CHANGES';
export const updateDatabaseChanges = change => ({
  type: UPDATE_DATABASE_CHANGES,
  payload: change
});

export const RESET_DATABASE_CHANGES = 'RESET_DATABASE_CHANGES';
export const resetDatabaseChanges = () => ({ type: RESET_DATABASE_CHANGES });

export const UPDATE_DATABASE_STATE = 'UPDATE_DATABASE_STATE';
export const updateDatabaseState = () => ({ type: UPDATE_DATABASE_STATE });

export const RESET_DATABASE_STATE = 'RESET_DATABASE_STATE';
export const resetDatabaseState = () => ({ type: RESET_DATABASE_STATE });

export const SET_ACTIVE_DATABASE = 'SET_ACTIVE_DATABASE';
export const setActiveDatabase = (category, name) => ({
  type: SET_ACTIVE_DATABASE,
  payload: { category, name }
});
