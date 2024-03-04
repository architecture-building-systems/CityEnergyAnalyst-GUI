import { Suspense, createContext, lazy, useEffect, useState } from 'react';
import { Route, Switch } from 'react-router-dom';
import SideNav from '../components/HomePage/SideNav';
import Header from '../components/HomePage/Header';
import { ToolRoute } from '../components/Tools/Tool';
import { useFetchProject } from '../components/Project/Project';

import routes from '../constants/routes.json';
import { useDispatch, useSelector } from 'react-redux';
import { updateScenario } from '../actions/project';
import StatusBar from '../components/HomePage/StatusBar/StatusBar';

import './HomePage.css';

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
const InputEditor = lazy(() => import('../components/InputEditor/InputEditor'));
const Dashboard = lazy(() => import('../components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(
  () => import('../components/DatabaseEditor/DatabaseEditor'),
);
const Landing = lazy(() => import('../components/Landing/Landing'));

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
        <div id="homepage-header-container">
          <Header />
        </div>

        <div id="homepage-sidebar-container">
          <SideNav />
        </div>

        <div id="homepage-content-container">
          <div id="homepage-content">
            <Switch>
              <Route path={routes.PROJECT_OVERVIEW}>
                <Suspense>
                  <Project />
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
