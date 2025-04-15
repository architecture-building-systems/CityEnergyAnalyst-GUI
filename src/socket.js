import { io } from 'socket.io-client';
import { getAccessTokenStringFromCookies } from './api/axios';

const socket = io(`${import.meta.env.VITE_CEA_URL}`, {
  withCredentials: !!getAccessTokenStringFromCookies(),
});

export default socket;
