import { createContext, useEffect, useState } from 'react';
import { Route, Switch } from 'react-router-dom';
import { Layout } from 'antd';
import SideNav from '../components/HomePage/SideNav';
import Header from '../components/HomePage/Header';
import { ToolRoute } from '../components/Tools/Tool';
import InputEditor from '../components/InputEditor/InputEditor';
import Dashboard from '../components/Dashboard/Dashboard';
import Project, { useFetchProject } from '../components/Project/Project';
import Landing from '../components/Landing/Landing';
import DatabaseEditor from '../components/DatabaseEditor/DatabaseEditor';

import routes from '../constants/routes';
import { useDispatch, useSelector } from 'react-redux';
import { updateScenario } from '../actions/project';
import StatusBar from '../components/HomePage/StatusBar/StatusBar';

const { Content } = Layout;

export const LayoutContext = createContext();

const ContextProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <LayoutContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </LayoutContext.Provider>
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
      <Layout>
        <SideNav />
        <Layout
          style={{
            height: 'calc(100vh - 24px)',
          }}
        >
          <Header />
          <Content
            style={{
              margin: '24px 16px',
              marginTop: 88,
              padding: 24,
              background: '#fff',
              minHeight: 'fit-content',
              overflow: 'auto',
            }}
          >
            <Switch>
              <Route path={routes.PROJECT_OVERVIEW} component={Project} />
              <Route path={routes.INPUT_EDITOR} component={InputEditor} />
              <Route path={`${routes.TOOLS}/:script`} component={ToolRoute} />
              <Route path={routes.DASHBOARD} component={Dashboard} />
              <Route path={routes.DATABASE_EDITOR} component={DatabaseEditor} />
              <Route exact path={routes.HOME} component={Landing} />
            </Switch>
          </Content>
        </Layout>
      </Layout>
      <StatusBar />
    </ContextProvider>
  );
};

export default HomePage;
