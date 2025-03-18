import { Suspense, lazy, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import routes from '../constants/routes.json';
import { useDispatch } from 'react-redux';
import StatusBar from '../components/StatusBar/StatusBar';

import './HomePage.css';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { Button, ConfigProvider } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { push } from 'connected-react-router';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInitProjectStore } from '../components/Project/store';

import Loading from '../components/Loading/Loading';

const Project = lazy(() => import('./Project'));
const CreateScenario = lazy(() => import('./CreateScenario'));
const Dashboard = lazy(() => import('../components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(
  () => import('../components/DatabaseEditor/DatabaseEditor'),
);

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
          <Suspense fallback={<Loading />}>
            <Project />
          </Suspense>
        </Route>
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

const queryClient = new QueryClient();
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
      <QueryClientProvider client={queryClient}>
        <div id="homepage-container">
          <div id="homepage-content-container">
            <HomePageContent />
          </div>
          <div id="homepage-status-bar-container">
            <StatusBar />
          </div>
        </div>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default HomePage;
