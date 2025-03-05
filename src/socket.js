import { io } from 'socket.io-client';

const socket = io(`${import.meta.env.VITE_CEA_URL}`);

export default socket;
