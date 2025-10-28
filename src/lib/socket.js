import { io } from 'socket.io-client';
import { getAccessTokenStringFromCookies } from './api/axios';

const socket = io(`${import.meta.env.VITE_CEA_URL}`, {
  withCredentials: !!getAccessTokenStringFromCookies(),

  transports: ['websocket', 'polling'], // Try websocket first
  upgrade: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity, // Keep trying to reconnect
  timeout: 20000,
});

// Connection event handlers
socket.on('connect', () => {
  if (import.meta.env.DEV) {
    console.log('Socket.IO connected:', socket.id);
  }
});

socket.on('disconnect', (reason) => {
  if (import.meta.env.DEV) {
    console.log('Socket.IO disconnected:', reason);
  }
});

socket.on('reconnect', (attemptNumber) => {
  if (import.meta.env.DEV) {
    console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
  }
});

socket.on('reconnect_attempt', (attemptNumber) => {
  if (import.meta.env.DEV) {
    console.log('Socket.IO reconnection attempt:', attemptNumber);
  }
});

socket.on('reconnect_error', (error) => {
  if (import.meta.env.DEV) {
    console.error('Socket.IO reconnection error:', error.message);
  }
});

socket.on('reconnect_failed', () => {
  if (import.meta.env.DEV) {
    console.error('Socket.IO reconnection failed after all attempts');
  }
});

socket.on('connect_error', (error) => {
  if (import.meta.env.DEV) {
    console.error('Socket.IO connection error:', error.message);
  }
});

export default socket;
