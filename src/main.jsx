import React from 'react';
import ReactDOM from 'react-dom/client';

import App from 'app';
import 'index.css';

import '@ant-design/v5-patch-for-react-19';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
