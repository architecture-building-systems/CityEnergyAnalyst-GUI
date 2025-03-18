import { Component, Suspense, lazy } from 'react';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import routes from '../constants/routes.json';
import Loading from '../components/Loading/Loading';

import axios from 'axios';

axios.defaults.withCredentials = true;

const HomePage = lazy(() =>
  Promise.all([
    import('./HomePage'),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]).then(([moduleExports]) => moduleExports),
);

const Splash = lazy(() => import('../components/Splash/Splash'));

class App extends Component {
  render() {
    const { store, history } = this.props;

    return (
      <div>
        <Provider store={store}>
          <ConnectedRouter history={history}>
            <Switch>
              <Route exact path={routes.SPLASH}>
                <Suspense>
                  <Splash />
                </Suspense>
              </Route>
              <Route path={routes.HOME}>
                <Suspense fallback={<Loading />}>
                  <HomePage />
                </Suspense>
              </Route>
            </Switch>
          </ConnectedRouter>
        </Provider>
      </div>
    );
  }
}
export default App;
