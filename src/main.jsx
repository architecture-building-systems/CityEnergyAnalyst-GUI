import React from 'react';
import ReactDOM from 'react-dom/client';

import App from 'app';
import 'index.css';

import '@fontsource/space-grotesk';

import { initPostHog } from 'lib/posthog';
import ErrorBoundary from 'utils/ReportingErrorBoundary';

initPostHog();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
