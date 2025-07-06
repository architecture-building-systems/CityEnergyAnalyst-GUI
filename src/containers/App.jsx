import { Suspense, lazy, useEffect } from 'react';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import routes from '../constants/routes.json';
import Loading from '../components/Loading/Loading';

const HomePage = lazy(() =>
  Promise.all([
    import('./HomePage'),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]).then(([moduleExports]) => moduleExports),
);

const Splash = lazy(() => import('../components/Splash/Splash'));

const useDevTitle = () => {
  useEffect(() => {
    const prevTitle = document.title;
    if (process.env.NODE_ENV === 'development')
      document.title = `[DEV] ${document.title}`;
    return () => {
      document.title = prevTitle;
    };
  }, []);
};

const App = ({ store, history }) => {
  useDevTitle();

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
            <Suspense fallback={<Loading />}>
              <HomePage />
            </Suspense>
          </Route>
        </Switch>
      </ConnectedRouter>
    </Provider>
  );
};

export default App;
