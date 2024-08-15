import { Suspense, createContext, lazy, useEffect, useState } from 'react';
import { Route, Switch } from 'react-router-dom';
import SideNav from '../components/HomePage/SideNav';
import Header from '../components/HomePage/Header';
import { ToolRoute } from '../components/Tools/Tool';

import routes from '../constants/routes.json';
import { useDispatch, useSelector } from 'react-redux';
import { updateScenario } from '../actions/project';
import StatusBar from '../components/HomePage/StatusBar/StatusBar';

import './HomePage.css';
import { useFetchProject } from '../utils/hooks';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

export const LayoutContext = createContext();

const ContextProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <LayoutContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </LayoutContext.Provider>
  );
};

const Project = lazy(() => import('../components/Project/Project'));
const CreateScenario = lazy(() => import('./CreateScenario'));
const InputEditor = lazy(() => import('../components/InputEditor/InputEditor'));
const Dashboard = lazy(() => import('../components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(
  () => import('../components/DatabaseEditor/DatabaseEditor'),
);
const Landing = lazy(() => import('../components/Landing/Landing'));

const HomePageContent = () => {
  return (
    <div id="homepage-content">
      <ErrorBoundary>
        <Switch>
          <Route path={routes.PROJECT_OVERVIEW}>
            <Suspense>
              <Project />
            </Suspense>
          </Route>
          <Route path={routes.CREATE_SCENARIO}>
            <Suspense>
              <CreateScenario />
            </Suspense>
          </Route>
          <Route path={routes.INPUT_EDITOR}>
            <Suspense>
              <InputEditor />
            </Suspense>
          </Route>
          <Route path={`${routes.TOOLS}/:script`} component={ToolRoute} />
          <Route path={routes.DASHBOARD}>
            <Suspense>
              <Dashboard />
            </Suspense>
          </Route>
          <Route path={routes.DATABASE_EDITOR}>
            <Suspense>
              <DatabaseEditor />
            </Suspense>
          </Route>
          <Route exact path={routes.HOME}>
            <Suspense>
              <Landing />
            </Suspense>
          </Route>
        </Switch>
      </ErrorBoundary>
    </div>
  );
};

const HomePage = () => {
  const fetchProject = useFetchProject();
  const dispatch = useDispatch();

  const {
    info: { project, scenario_name: scenarioName },
  } = useSelector((state) => state.project);

  useEffect(() => {
    fetchProject(project).then(({ scenarios_list: scenariosList }) => {
      // Set scenario back if it exists
      if (scenariosList.includes(scenarioName))
        dispatch(updateScenario(scenarioName));
    });
  }, []);

  return (
    <ContextProvider>
      <div id="homepage-container">
        <div id="homepage-top-container">
          <div id="homepage-sidebar-container">
            <SideNav />
          </div>
          <div id="homepage-right-container">
            <div id="homepage-header-container">
              <Header />
            </div>
            <div id="homepage-content-container">
              <HomePageContent />
            </div>
          </div>
        </div>
        <div id="homepage-status-bar-container">
          <StatusBar />
        </div>
      </div>
    </ContextProvider>
  );
};

export default HomePage;
