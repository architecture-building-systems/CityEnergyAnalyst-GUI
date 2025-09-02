import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';

import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';
import StatusBar from 'features/status-bar/components/StatusBar';

import './HomePage.css';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { Button, ConfigProvider } from 'antd';
import { LeftOutlined } from '@ant-design/icons';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInitProjectStore } from 'features/project/stores/projectStore';

import Loading from 'components/Loading';
import { apiClient } from 'lib/api/axios';
import { useInitUserInfo, useUserInfo } from 'stores/userStore';
import { useFetchServerLimits } from 'stores/serverStore';

// Route-level code splitting for better performance
const Project = lazy(() => import('app/Project'));
const CreateScenario = lazy(() => import('app/CreateScenario'));
const UploadDownload = lazy(() => import('app/UploadDownload'));
// const Dashboard = lazy(() => import('components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(() => import('app/DatabaseEditor'));
const OnboardingPage = lazy(() => import('components/OnboardingPage'));

const useCheckServerStatus = () => {
  const [isServerUp, setIsServerUp] = useState(false);

  useEffect(() => {
    const checkServerStatus = () => {
      apiClient
        .get('/server/version')
        .then(({ data }) => {
          if (data?.version) {
            console.log(`City Energy Analyst v${data.version}`);
            setIsServerUp(true);
            clearInterval(interval);
          } else {
            console.log('Waiting for connection to server...');
          }
        })
        .catch((error) => {
          console.log('Error connecting to server:', error.message);
        });
    };

    // Run immediately on mount
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 1500);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  return isServerUp;
};

const HomePageContent = () => {
  const userInfo = useUserInfo();
  const initUserInfo = useInitUserInfo();
  const fetchServerLimits = useFetchServerLimits();

  const { push } = useNavigationStore();

  useEffect(() => {
    if (userInfo == null) return;

    if (!userInfo?.onboarded) {
      // Redirect to onboarding page
      push(routes.ONBOARDING);
    } else if (window.location.pathname === routes.ONBOARDING) {
      // Redirect to project page
      push(routes.PROJECT);
    }
    fetchServerLimits();
  }, [userInfo]);

  useEffect(() => {
    initUserInfo();
  }, []);

  useInitProjectStore();

  // Load user info before rendering
  if (userInfo == null) return <Loading />;

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path={routes.ONBOARDING}
          element={
            <Suspense fallback={<Loading />}>
              <OnboardingPage />
            </Suspense>
          }
        />
        <Route
          path={routes.CREATE_SCENARIO}
          element={
            <Suspense fallback={<Loading />}>
              <Cardwrapper style={{ backgroundColor: '#D4DADC' }}>
                <CreateScenario />
              </Cardwrapper>
            </Suspense>
          }
        />
        <Route
          path={routes.UPLOAD_DOWNLOAD}
          element={
            <Suspense fallback={<Loading />}>
              <Cardwrapper style={{ backgroundColor: '#D4DADC' }}>
                <UploadDownload />
              </Cardwrapper>
            </Suspense>
          }
        />
        <Route
          path={routes.DATABASE_EDITOR}
          element={
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
          }
        />
        <Route
          path={routes.PROJECT}
          element={
            <Suspense fallback={<Loading />}>
              <Project />
            </Suspense>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

const Cardwrapper = ({ children, style }) => {
  const { push } = useNavigationStore();

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
        onClick={() => push(routes.PROJECT)}
      >
        <LeftOutlined /> Return
      </Button>
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
};

const queryClient = new QueryClient();
const HomePage = () => {
  const isServerUp = useCheckServerStatus();
  if (!isServerUp) return <Loading />;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1470AF',
          colorInfo: '#1470AF',
        },
        components: {
          Tooltip: {
            fontSize: 12,
          },
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
