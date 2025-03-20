import axios from 'axios';
import { accessTokenCookieExists } from '../api/axios';

export const httpAction = ({
  type = '',
  baseURL = `${import.meta.env.VITE_CEA_URL}/api`,
  url = '',
  method = 'GET',
  data = null,
  headers = {},
  onSuccess = () => {},
  onFailure = () => {},
  payload = {},
  editPayload = () => {},
}) => ({
  HTTP_ACTION: {
    type,
    baseURL,
    url,
    method,
    data,
    headers,
    onSuccess,
    onFailure,
    payload,
    editPayload,
  },
});

const httpMiddleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (!action.HTTP_ACTION) return next(action);
    const {
      type,
      baseURL,
      url,
      method,
      data,
      headers,
      onSuccess,
      onFailure,
      payload,
      editPayload,
    } = action.HTTP_ACTION;
    const dataOrParams = ['GET', 'DELETE'].includes(method) ? 'params' : 'data';
    const axiosOptions = {
      baseURL,
      url,
      method,
      headers,
      [dataOrParams]: data,
      // Add credential only if cookie exists
      withCredentials: accessTokenCookieExists(),
    };

    const fetch = async () => {
      try {
        const { data } = await axios.request(axiosOptions);
        dispatch({
          type: type + '_SUCCESS',
          payload: editPayload(data) || data,
        });
        onSuccess(data);
      } catch (error) {
        const errorPayload =
          error?.response || // Received response out of 2xx range
          error?.request || // The request was made but no response was received
          error; // Something happened in setting up the request that triggered an Error
        console.error(errorPayload);
        dispatch({
          type: type + '_FAILED',
          payload: editPayload(errorPayload) || errorPayload,
        });
        onFailure(error);
      }
    };

    dispatch({ type: type, payload });
    fetch();
  };

export default httpMiddleware;
