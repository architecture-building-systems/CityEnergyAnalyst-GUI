export const INIT_DATABASE_STATE = 'INIT_DATABASE_STATE';
export const initDatabaseState = () => ({ type: INIT_DATABASE_STATE });

export const INIT_DATABASE_STATE_SUCCESS = 'INIT_DATABASE_STATE_SUCCESS';
export const initDatabaseSuccess = values => ({
  type: INIT_DATABASE_STATE_SUCCESS,
  payload: values
});
export const INIT_DATABASE_STATE_FAILURE = 'INIT_DATABASE_STATE_FAILURE';
export const initDatabaseFailure = error => ({
  type: INIT_DATABASE_STATE_FAILURE,
  payload: error
});

export const RESET_DATABASE_STATE = 'RESET_DATABASE_STATE';
export const RESET_DATABASE_UNDO = 'RESET_DATABASE_UNDO';
export const resetDatabaseState = () => dispatch => {
  dispatch({ type: RESET_DATABASE_STATE });
  dispatch({ type: RESET_DATABASE_UNDO });
};

export const UPDATE_DATABASE_VALIDATION = 'UPDATE_DATABASE_VALIDATION';
export const updateDatabaseValidation = validation => ({
  type: UPDATE_DATABASE_VALIDATION,
  payload: validation
});

export const SET_ACTIVE_DATABASE = 'SET_ACTIVE_DATABASE';
export const setActiveDatabase = (category, name) => ({
  type: SET_ACTIVE_DATABASE,
  payload: { category, name }
});

export const ADD_DATABASE_ROW = 'ADD_DATABASE_ROW';
export const addDatabaseRow = (databaseName, sheetName, columns) => ({
  type: ADD_DATABASE_ROW,
  payload: { databaseName, sheetName, columns }
});

export const EDIT_DATADBASE_DATA = 'EDIT_DATADBASE_DATA';
export const editDatabaseData = (
  category,
  databaseName,
  tableName,
  dataLocator,
  changes
) => ({
  type: EDIT_DATADBASE_DATA,
  payload: { category, databaseName, tableName, dataLocator, changes }
});
