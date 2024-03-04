import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './containers/App';
import { configureStore, history } from './store/configureStore';
import './app.global.css';
import axios from 'axios';

const store = configureStore();

axios.interceptors.request.use((request) => {
  console.debug('Starting Request', JSON.stringify(request, null, 2));
  return request;
});

axios.interceptors.response.use((config) => {
  console.log('Config:', JSON.stringify(config, null, 2));
  return config;
});

axios.interceptors.response.use((response) => {
  console.log('Response:', JSON.stringify(response, null, 2));
  return response;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App store={store} history={history} />
  </React.StrictMode>,
);
