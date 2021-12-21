import { render } from 'react-dom';
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

render(<App store={store} history={history} />, document.getElementById('app'));
