import { httpAction } from '../store/httpMiddleware';
import axios from 'axios';

export const FETCH_DATABASE = 'FETCH_DATABASE';
export const FETCH_DATABASE_SUCCESS = 'FETCH_DATABASE_SUCCESS';
export const FETCH_DATABASE_FAILED = 'FETCH_DATABASE_FAILED';

export const fetchDatabase = db => dispatch => {
  //   dispatch(
  //     httpAction({
  //       url: `/inputs/databases/${db}`,
  //       type: FETCH_DATABASE,
  //       payload: { db },
  //       editPayload: data => ({ data, db })
  //     })
  //   );

  const fetchDBData = async () => {
    const resp = await axios.get(
      `http://localhost:5050/api/inputs/databases/${db}`
    );
    return resp.data;
  };
  const fetchDBSchema = async () => {
    const resp = await axios.get(
      `http://localhost:5050/api/databases/schema/${db}`
    );
    return resp.data;
  };

  const fetchAll = async () => {
    try {
      dispatch({ type: FETCH_DATABASE, payload: { db } });
      // eslint-disable-next-line
      const values = await Promise.all([fetchDBData(), fetchDBSchema()]);
      dispatch({
        type: FETCH_DATABASE_SUCCESS,
        payload: { data: values[0], schema: values[1], db }
      });
    } catch (err) {
      dispatch({ type: FETCH_DATABASE_FAILED, payload: { data: err } });
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
