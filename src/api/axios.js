import axios from 'axios';

export const COOKIE_NAME = import.meta.env.VITE_AUTH_COOKIE_NAME;

export const getAccessTokenFromCookies = () => {
  const cookies = document.cookie.split(';');

  const tokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${COOKIE_NAME}=`),
  );

  if (tokenCookie) {
    return tokenCookie.trim().substring(`${COOKIE_NAME}=`.length);
  }

  return null;
};

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_CEA_URL}`,
});

apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = !!getAccessTokenFromCookies();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
