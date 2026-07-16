import { io } from 'socket.io-client';
import { getAccessTokenStringFromCookies } from './api/axios';

let socket = null;

// Track connection readiness
let isConnected = false;
const connectionCallbacks = [];

const createSocket = () => {
  const instance = io(`${import.meta.env.VITE_CEA_URL}`, {
    withCredentials: !!getAccessTokenStringFromCookies(),

    transports: ['websocket', 'polling'], // Try websocket first
    upgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Keep trying to reconnect
    timeout: 20000,
  });

  isConnected = instance.connected;

  // Connection event handlers
  instance.on('connect', () => {
    isConnected = true;

    if (import.meta.env.DEV) {
      console.log('Socket.IO connected:', instance.id);
    }

    // Resolve all pending connection promises
    while (connectionCallbacks.length > 0) {
      const callback = connectionCallbacks.shift();
      callback();
    }
  });

  instance.on('disconnect', (reason) => {
    isConnected = false;

    if (import.meta.env.DEV) {
      console.log('Socket.IO disconnected:', reason);
    }
  });

  instance.io.on('reconnect', (attemptNumber) => {
    if (import.meta.env.DEV) {
      console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
    }
  });

  instance.io.on('reconnect_attempt', (attemptNumber) => {
    if (import.meta.env.DEV) {
      console.log('Socket.IO reconnection attempt:', attemptNumber);
    }
  });

  instance.io.on('reconnect_error', (error) => {
    if (import.meta.env.DEV) {
      console.error('Socket.IO reconnection error:', error.message);
    }
  });

  instance.io.on('reconnect_failed', () => {
    if (import.meta.env.DEV) {
      console.error('Socket.IO reconnection failed after all attempts');
    }
  });

  instance.on('connect_error', (error) => {
    if (import.meta.env.DEV) {
      console.error('Socket.IO connection error:', error.message);
    }
  });

  return instance;
};

export const getSocket = () => {
  if (!socket) socket = createSocket();
  return socket;
};

// Helper to remove a specific callback from the queue
export const removeConnectionCallback = (callback) => {
  const index = connectionCallbacks.indexOf(callback);
  if (index > -1) {
    connectionCallbacks.splice(index, 1);
  }
};

// Helper to wait for connection
// If callback is provided, it will be called after connection is established
// Otherwise, returns a Promise that resolves when connected
export const waitForConnection = (callback) => {
  if (callback) {
    // Callback mode
    if (isConnected) {
      callback();
    } else {
      connectionCallbacks.push(callback);
    }
  } else {
    // Promise mode
    return new Promise((resolve) => {
      if (isConnected) {
        resolve();
      } else {
        connectionCallbacks.push(resolve);
      }
    });
  }
};

// Helper to check if socket is connected
export const isSocketConnected = () => isConnected;
