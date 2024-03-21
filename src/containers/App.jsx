import { Component, Suspense, lazy } from 'react';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import routes from '../constants/routes.json';

const HomePage = lazy(() => import('./HomePage'));
const Splash = lazy(() => import('../components/Splash/Splash'));

class App extends Component {
  render() {
    const { store, history } = this.props;
    return (
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <Switch>
            <Route exact path={routes.SPLASH}>
              <Suspense>
                <Splash />
              </Suspense>
            </Route>
            <Route path={routes.HOME}>
              <Suspense>
                <HomePage />
              </Suspense>
            </Route>
          </Switch>
        </ConnectedRouter>
      </Provider>
    );
  }
}
export default App;
