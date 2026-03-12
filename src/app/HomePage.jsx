import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router';

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
import { useIsValidUser, useUserQuery } from 'stores/useUserQuery';
import { useFetchServerLimits } from 'stores/serverStore';
import { isElectron } from 'utils/electron';
import { useWaitForServer } from 'stores/useServerVersionQuery';

// Route-level code splitting for better performance
const Project = lazy(() => import('app/Project'));
const CreateScenario = lazy(() => import('app/CreateScenario'));
const UploadDownload = lazy(() => import('app/UploadDownload'));
// const Dashboard = lazy(() => import('components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(() => import('app/DatabaseEditor'));
const OnboardingPage = lazy(() => import('components/OnboardingPage'));

const HomePageContent = () => {
  const { data: userInfo, isLoading } = useUserQuery();
  const isValidUser = useIsValidUser();
  const fetchServerLimits = useFetchServerLimits();

  const { push } = useNavigationStore();

  useEffect(() => {
    // Wait for userInfo to be loaded
    // Also not fetch server limits if Electron or localuser
    if (isElectron() || !isValidUser) return;

    if (!userInfo?.onboarded) {
      // Redirect to onboarding page
      push(routes.ONBOARDING);
    } else if (window.location.pathname === routes.ONBOARDING) {
      // Redirect to project page
      push(routes.PROJECT);
    }
    fetchServerLimits();
  }, [userInfo]);

  useInitProjectStore();

  // Load user info before rendering
  if (isLoading) return <Loading />;

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
        {/* Catch-all route - redirect to root/project page */}
        <Route path="*" element={<Navigate to={routes.PROJECT} replace />} />
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

const queryClient = new QueryClient({
  // Uncomment to enable custom QueryClient behavior:
  // defaultOptions: {
  //   queries: {
  //     staleTime: 5 * 60 * 1000, // 5 minutes
  //     gcTime: 10 * 60 * 1000, // 10 minutes (cache garbage collection time)
  //     refetchOnWindowFocus: false, // Don't refetch on window focus (good for forms)
  //     refetchOnReconnect: true, // Refetch when internet reconnects
  //     retry: 3, // Retry failed requests 3 times
  //   },
  // },
});

// For dev tools - attach queryClient to window object (dev only)
if (import.meta.env.DEV) {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}

const HomePageInner = () => {
  const serverStatus = useWaitForServer();
  const shouldWaitForServer =
    // Backend readiness for Electron is handled in the main process, so we can skip this check in Electron
    !isElectron() &&
    navigator.onLine !== false &&
    (serverStatus.isLoading || serverStatus.isPending);

  if (shouldWaitForServer) return <Loading />;

  return (
    <div id="homepage-container">
      <div id="homepage-content-container">
        <HomePageContent />
      </div>
      <div id="homepage-status-bar-container">
        <StatusBar />
      </div>
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
        components: {
          Tooltip: {
            fontSize: 12,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <HomePageInner />
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default HomePage;
