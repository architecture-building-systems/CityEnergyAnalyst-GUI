import axios from 'axios';

export const httpAction = ({
  type = '',
  url = '',
  method = 'GET',
  data = null,
  headers = [],
  onSuccess = () => {},
  onFailure = () => {}
}) => ({
  HTTP_ACTION: { type, url, method, data, headers, onSuccess, onFailure }
});

const httpMiddleware = ({ dispatch, getState }) => next => action => {
  if (action.HTTP_ACTION) {
    const {
      type,
      url,
      method,
      data,
      headers,
      onSuccess,
      onFailure
    } = action.HTTP_ACTION;
    const dataOrParams = ['GET', 'DELETE'].includes(method) ? 'params' : 'data';
    const axiosOptions = {
      baseURL: `${process.env.CEA_URL}/api`,
      url,
      method,
      headers,
      [dataOrParams]: data
    };

    const fetch = async () => {
      try {
        const { data } = await axios.request(axiosOptions);
        dispatch({ type: type + '_SUCCESS', payload: data });
        onSuccess(data);
      } catch (error) {
        dispatch({ type: type + '_FAILED', payload: error });
        onFailure(error);
      }
    };

    dispatch({ type: type });
    fetch();
  } else {
    return next(action);
  }
};

export default httpMiddleware;
