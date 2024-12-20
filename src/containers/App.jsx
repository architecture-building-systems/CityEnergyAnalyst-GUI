import { Component, Suspense, lazy } from 'react';
import { Provider } from 'react-redux';
import { Switch, Route } from 'react-router';
import { ConnectedRouter } from 'connected-react-router';

import CeaLogoAnimate from '../assets/cea-logo-animate.svg';
import routes from '../constants/routes.json';

const HomePage = lazy(() => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(import('./HomePage')), 800);
  });
});
const Splash = lazy(() => import('../components/Splash/Splash'));

const Loading = () => {
  return (
    <div
      className="cea-loading"
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',

        gap: 24,
      }}
    >
      <div
        style={{
          minWidth: 200,
          width: '18%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          gap: 24,
        }}
      >
        <CeaLogoAnimate />
        <div
          style={{
            fontSize: 28,
            color: 'rgb(69,77,84)',
            fontFamily: 'Arial',
          }}
        >
          <div>City</div>
          <div>Energy</div>
          <div>Analyst</div>
          <div
            style={{
              display: 'flex',
              width: 'fit-content',
              background: 'rgb(69,77,84)',
              borderRadius: 8,
              padding: '3px 8px',
              color: '#fff',
              marginTop: 8,
              fontSize: 24,
              fontWeight: 'bold',
            }}
          >
            CEA 4
          </div>
        </div>
      </div>
      {/* <img src={ceaLogo} style={{ width: 350 }} alt="CEA Logo" /> */}
    </div>
  );
};

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
