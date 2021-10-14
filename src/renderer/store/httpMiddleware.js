import axios from 'axios';

export const httpAction = ({
  type = '',
  baseURL = `${process.env.CEA_URL}/api`,
  url = '',
  method = 'GET',
  data = null,
  headers = [],
  onSuccess = (data) => {},
  onFailure = (error) => {},
  payload = {},
  editPayload = (payload) => {},
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
  ({ dispatch, getState }) =>
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
          // Received response out of 2xx range
          error.response
            ? error.response
            : // The request was made but no response was received
            error.request
            ? error.request
            : // Something happened in setting up the request that triggered an Error
              error;
        console.log(editPayload());
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
