import { hot } from 'react-hot-loader/root';
import TitleBar from 'frameless-titlebar';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import routes from '../constants/routes';
import HomePage from './HomePage';

import { getStatic } from '@/utils/static';
import { githubTemplate } from '@/utils/menu';

class App extends Component {
  render() {
    const { store, history } = this.props;
    return (
      <React.Fragment>
        <TitleBar
          icon={getStatic('logo.png')}
          menu={githubTemplate}
          theme={{
            barTheme: 'dark',
            menuDimItems: false,
            showIconDarwin: false,
            barBackgroundColor: 'rgb(36, 37, 38)',
            barColor: 'rgb(230, 230, 230)'
          }}
        />
        <Provider store={store}>
          <ConnectedRouter history={history}>
            <Switch>
              <Route path={routes.HOME} component={HomePage} />
            </Switch>
          </ConnectedRouter>
        </Provider>
      </React.Fragment>
    );
  }
}
export default hot(App);
