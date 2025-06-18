import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './containers/App';
import { configureStore, history } from './store/configureStore';
import './app.global.css';

import '@ant-design/v5-patch-for-react-19';

const store = configureStore();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App store={store} history={history} />
  </React.StrictMode>,
);
