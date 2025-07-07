import { Suspense, lazy, useEffect } from 'react';
import { Switch, Route, Router } from 'react-router';
import useNavigationStore, { history } from '../stores/navigationStore';

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

const App = () => {
  useDevTitle();
  const init = useNavigationStore((state) => state.init);

  useEffect(() => {
    return init();
  }, [init]);

  return (
    <Router history={history}>
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
    </Router>
  );
};

export default App;
