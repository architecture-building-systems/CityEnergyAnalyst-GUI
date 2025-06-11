import { io } from 'socket.io-client';
import { getAccessTokenStringFromCookies } from './api/axios';

const socket = io(`${import.meta.env.VITE_CEA_URL}`, {
  withCredentials: !!getAccessTokenStringFromCookies(),

  transports: ['websocket', 'polling'], // Try websocket first
  upgrade: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

export default socket;
