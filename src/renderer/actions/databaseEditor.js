import { httpAction } from '../store/httpMiddleware';
import axios from 'axios';

const fetchDBData = async db => {
  const resp = await axios.get(
    `http://localhost:5050/api/inputs/databases/${db}`
  );
  return resp.data;
};
const fetchDBSchema = async db => {
  const resp = await axios.get(
    `http://localhost:5050/api/databases/schema/${db}`
  );
  return resp.data;
};

export const FETCH_DATABASE = 'FETCH_DATABASE';
export const FETCH_DATABASE_SUCCESS = 'FETCH_DATABASE_SUCCESS';
export const FETCH_DATABASE_FAILURE = 'FETCH_DATABASE_FAILURE';
export const fetchDatabase = db => dispatch => {
  const fetchAll = async () => {
    try {
      dispatch({ type: FETCH_DATABASE, payload: { db } });
      // eslint-disable-next-line
      const values = await Promise.all([fetchDBData(db), fetchDBSchema(db)]);
      dispatch({
        type: FETCH_DATABASE_SUCCESS,
        payload: { data: values[0], schema: values[1], db }
      });
    } catch (err) {
      dispatch({ type: FETCH_DATABASE_FAILURE, payload: { db, data: err } });
    }
  };

  fetchAll();
};

export const UPDATE_DATABASE_VALIDATION = 'UPDATE_DATABASE_VALIDATION';
export const updateDatabaseValidation = validation => dispatch => {
  dispatch({ type: UPDATE_DATABASE_VALIDATION, payload: { validation } });
};

export const UPDATE_DATABASE_STATE = 'UPDATE_DATABASE_STATE';
export const updateDatabaseState = () => ({ type: UPDATE_DATABASE_STATE });

export const RESET_DATABASE_STATE = 'RESET_DATABASE_STATE';
export const resetDatabaseState = () => ({ type: RESET_DATABASE_STATE });
