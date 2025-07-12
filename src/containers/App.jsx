import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, BrowserRouter, HashRouter } from 'react-router';
import useNavigationStore from '../stores/navigationStore';
import NavigationProvider from '../components/NavigationProvider';
import { isElectron } from '../utils/electron';

import routes from '../constants/routes.json';
import Loading from '../components/Loading/Loading';

// const HomePage = lazy(() =>
//   Promise.all([
//     import('./HomePage'),
//     new Promise((resolve) => setTimeout(resolve, 1000)),
//   ]).then(([moduleExports]) => moduleExports),
// );

// Route-level code splitting
const HomePage = lazy(() => import('./HomePage'));
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

  // Use HashRouter for Electron (file:// protocol), BrowserRouter for web
  const Router = isElectron() ? HashRouter : BrowserRouter;

  return (
    <Router>
      <NavigationProvider>
        <Routes>
          <Route
            exact
            path={routes.SPLASH}
            element={
              <Suspense>
                <Splash />
              </Suspense>
            }
          />
          <Route
            path="/*"
            element={
              <Suspense fallback={<Loading />}>
                <HomePage />
              </Suspense>
            }
          />
        </Routes>
      </NavigationProvider>
    </Router>
  );
};

export default App;
