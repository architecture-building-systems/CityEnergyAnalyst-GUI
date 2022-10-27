import { createRoot } from 'react-dom/client';
import App from './containers/App';
import { configureStore, history } from './store/configureStore';
import './app.global.css';
import log from 'electron-log';
import path from 'path';

log.transports.file.resolvePath = (variables) => {
  return path.join(variables.libraryDefaultDir, 'console.log');
};
const rendererLog = log.scope('renderer');
console.log = rendererLog.log;
console.error = rendererLog.error;

const store = configureStore();

const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App store={store} history={history} />);
