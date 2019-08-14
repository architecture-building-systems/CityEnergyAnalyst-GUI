import { hot } from 'react-hot-loader/root';
import TitleBar from 'frameless-titlebar';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import routes from '../constants/routes';
import HomePage from './HomePage';

class App extends Component {
  render() {
    const { store, history } = this.props;
    return (
      <React.Fragment>
        <TitleBar
          app="City Energy Analyst"
          theme={{
            barTheme: 'dark',
            barBackgroundColor: '#251d24',
            menuStyle: 'vertical',
            menuHighlightColor: '#52a98c',
            menuDimItems: false
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
