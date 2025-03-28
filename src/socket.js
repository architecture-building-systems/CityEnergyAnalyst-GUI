import { io } from 'socket.io-client';
import { getAccessTokenFromCookies } from './api/axios';

const socket = io(`${import.meta.env.VITE_CEA_URL}`, {
  withCredentials: !!getAccessTokenFromCookies(),
});

export default socket;
