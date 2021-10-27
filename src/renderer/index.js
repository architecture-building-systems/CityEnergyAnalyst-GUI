import { render } from 'react-dom';
import App from './containers/App';
import { configureStore, history } from './store/configureStore';
import './app.global.css';

const store = configureStore();

render(<App store={store} history={history} />, document.getElementById('app'));
