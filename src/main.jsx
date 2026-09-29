import React from 'react';
import ReactDOM from 'react-dom/client';

import App from 'app';
import 'index.css';

import '@fontsource/space-grotesk';

import { initPostHog } from 'lib/posthog';

initPostHog();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
