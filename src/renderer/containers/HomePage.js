import {} from 'react';
import { Route, Switch } from 'react-router-dom';
import { Layout } from 'antd';
import SideNav from '../components/HomePage/SideNav';
import Header from '../components/HomePage/Header';
import { ToolRoute } from '../components/Tools/Tool';
import InputEditor from '../components/InputEditor/InputEditor';
import Dashboard from '../components/Dashboard/Dashboard';
import Project from '../components/Project/Project';
import StatusBar from '../components/StatusBar/StatusBar';
import Landing from '../components/Landing/Landing';
import DatabaseEditor from '../components/DatabaseEditor/DatabaseEditor';

import routes from '../constants/routes';

const { Content } = Layout;

const HomePage = () => {
  return (
    <>
      <Layout>
        <SideNav />
        <Layout
          style={{
            height: 'calc(100vh - 52px)',
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
    </>
  );
};

export default HomePage;
