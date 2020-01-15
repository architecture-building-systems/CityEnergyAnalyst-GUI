import { hot } from 'react-hot-loader/root';
import TitleBar from 'frameless-titlebar';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import routes from '../constants/routes';
import HomePage from './HomePage';
import Splash from '../components/Splash/Splash';

class App extends Component {
  render() {
    const { store, history } = this.props;
    return (
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <Switch>
            <Route exact path={routes.SPLASH} component={Splash} />
            <Route path={routes.HOME}>
              <div id="cea-title-bar">
                <TitleBar
                  app="City Energy Analyst"
                  theme={{
                    barTheme: 'dark',
                    menuDimItems: false,
                    showIconDarwin: false,
                    barBackgroundColor: 'rgb(36, 37, 38)',
                    barColor: 'rgb(230, 230, 230)'
                  }}
                />
              </div>
              <HomePage />
            </Route>
          </Switch>
        </ConnectedRouter>
      </Provider>
    );
  }
}
export default hot(App);
