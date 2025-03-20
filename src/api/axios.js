import axios from 'axios';

export const COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME;

const accessTokenCookieExists = () => {
  const cookies = document.cookie.split(';');
  return cookies.some((cookie) => cookie.trim().startsWith(`${COOKIE_NAME}=`));
};

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_CEA_URL}`,
});

apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = accessTokenCookieExists();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
