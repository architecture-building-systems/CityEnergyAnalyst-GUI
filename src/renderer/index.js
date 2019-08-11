import React from 'react';
import { render } from 'react-dom';
import App from './containers/App';
import { configureStore, history } from './store/configureStore';
import './app.global.css';

const store = configureStore();

render(<App store={store} history={history} />, document.getElementById('app'));

if (module.hot) {
  module.hot.accept('./containers/App', () => {
    // eslint-disable-next-line global-require
    const NextApp = require('./containers/App').default;
    render(
      <NextApp store={store} history={history} />,
      document.getElementById('app')
    );
  });
}
