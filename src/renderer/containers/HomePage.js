import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { Layout } from 'antd';
import SideNav from '../components/HomePage/SideNav';
import Header from '../components/HomePage/Header';
import Tool from '../components/Tools/Tool';
import InputEditor from '../components/InputEditor/InputEditor';

import routes from '../constants/routes';

const { Footer, Content } = Layout;

const HomePage = () => {
  return (
    <Layout>
      <SideNav />
      <Layout
        style={{
          minHeight: '100vh',
          maxHeight: 'max-content',
          minWidth: 500
        }}
      >
        <Header />
        <Content
          style={{
            margin: '24px 16px',
            marginTop: 96,
            padding: 24,
            background: '#fff'
          }}
        >
          <Switch>
            <Route path={`${routes.TOOLS}/:script`} component={Tool} />
            <Route path={routes.INPUT_EDITOR} component={InputEditor} />
            <Route path="/placeholder" component={PlaceHolder} />
          </Switch>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Ant Design ©2018 Created by Ant UED
        </Footer>
      </Layout>
    </Layout>
  );
};

const PlaceHolder = () => {
  return <div>PlaceHolder</div>;
};

export default HomePage;
