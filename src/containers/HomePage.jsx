import { Suspense, lazy, useEffect } from 'react';
import { Route, Switch } from 'react-router-dom';

import routes from '../constants/routes.json';
import { useDispatch, useSelector } from 'react-redux';
import { updateScenario } from '../actions/project';
import StatusBar from '../components/HomePage/StatusBar/StatusBar';

import './HomePage.css';
import { useFetchProject } from '../utils/hooks';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';

const CreateScenario = lazy(() => import('./CreateScenario'));
const Dashboard = lazy(() => import('../components/Dashboard/Dashboard'));
const DatabaseEditor = lazy(
  () => import('../components/DatabaseEditor/DatabaseEditor'),
);
const Landing = lazy(() => import('../components/Landing/Landing'));

const HomePageContent = () => {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path={routes.CREATE_SCENARIO}>
          <Suspense>
            <CreateScenario />
          </Suspense>
        </Route>
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

export default HomePage;
