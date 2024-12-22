import { Suspense, lazy, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import routes from '../constants/routes.json';
import { useDispatch } from 'react-redux';
import StatusBar from '../components/HomePage/StatusBar/StatusBar';

import './HomePage.css';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { Button, ConfigProvider } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { push } from 'connected-react-router';
import { useProjectStore } from '../components/Project/store';

const Project = lazy(() => import('./Project'));
const CreateScenario = lazy(() => import('./CreateScenario'));
const Dashboard = lazy(() => import('../components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(
  () => import('../components/DatabaseEditor/DatabaseEditor'),
);
// const Landing = lazy(() => import('../components/Landing/Landing'));

const useInitProjectStore = () => {
  const fetchConfig = useProjectStore((state) => state.fetchConfig);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);

  useEffect(() => {
    const initProject = async () => {
      const { project } = await fetchConfig();
      if (project) await fetchInfo(project);
      else console.error('Project not found', project);
    };

    initProject();
  }, []);
};

const HomePageContent = () => {
  useInitProjectStore();

  return (
    <ErrorBoundary>
      <Switch>
        <Route path={routes.CREATE_SCENARIO}>
          <Suspense>
            <Cardwrapper style={{ backgroundColor: '#D4DADC' }}>
              <CreateScenario />
            </Cardwrapper>
          </Suspense>
        </Route>
        <Route path={routes.DASHBOARD}>
          <Suspense>
            <Cardwrapper style={{ backgroundColor: '#D4DADC' }}>
              <div
                style={{
                  height: '100%',
                  overflow: 'auto',
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #eee',

                  padding: 12,
                  boxSizing: 'border-box',
                }}
              >
                <Dashboard />
              </div>
            </Cardwrapper>
          </Suspense>
        </Route>
        <Route path={routes.DATABASE_EDITOR}>
          <Suspense>
            <Cardwrapper style={{ backgroundColor: '#D4DADC' }}>
              <div
                style={{
                  height: '100%',
                  overflow: 'auto',
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #eee',

                  padding: 24,
                  boxSizing: 'border-box',
                }}
              >
                <DatabaseEditor />
              </div>
            </Cardwrapper>
          </Suspense>
        </Route>
        <Route path={routes.PROJECT}>
          <Suspense>
            <Project />
          </Suspense>
        </Route>
        {/* <Route exact path={routes.HOME}>
          <Suspense>
            <Landing />
          </Suspense>
        </Route> */}
      </Switch>
    </ErrorBoundary>
  );
};

const Cardwrapper = ({ children, style }) => {
  const dispatch = useDispatch();

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        padding: 24,

        height: '100%',
        overflow: 'auto',

        display: 'flex',
        flexDirection: 'column',
        gap: 24,

        ...style,
      }}
    >
      <Button
        style={{ marginRight: 'auto', position: 'sticky', top: 0, zIndex: 1 }}
        onClick={() => dispatch(push(routes.PROJECT))}
      >
        <LeftOutlined /> Return
      </Button>
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
};

const HomePage = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1470AF',
          colorInfo: '#1470AF',
        },
      }}
    >
      <div id="homepage-container">
        <div id="homepage-content-container">
          <HomePageContent />
        </div>
        <div id="homepage-status-bar-container">
          <StatusBar />
        </div>
      </div>
    </ConfigProvider>
  );
};

export default HomePage;
