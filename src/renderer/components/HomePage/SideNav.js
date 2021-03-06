import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { shell } from 'electron';
import { Link } from 'react-router-dom';
import { Layout, Menu, Icon } from 'antd';
import { setCollapsed } from '../../actions/homepage';
import ToolsMenu from './ToolsMenu';
import routes from '../../constants/routes';
import getStatic from '../../utils/static';

const { Sider } = Layout;
const { SubMenu } = Menu;
const logo = getStatic('cea-logo.png');

const SideNav = () => {
  // TODO: Maybe use context instead of redux for this
  const { collapsed } = useSelector((state) => state.sider);
  const { location } = useSelector((state) => state.router);
  const dispatch = useDispatch();

  const [broken, setBroken] = useState(false);
  const [prevCollapsed, setPrevCollapsed] = useState(true);

  const selectedKey = location.pathname;

  const collapseSider = (breakpoint) => {
    setBroken(breakpoint);
    if (breakpoint) {
      setPrevCollapsed(collapsed);
      if (!collapsed) {
        dispatch(setCollapsed(true));
      }
    } else {
      dispatch(setCollapsed(prevCollapsed));
    }
  };

  return (
    <Sider
      width="250"
      breakpoint="lg"
      collapsedWidth={broken ? '0' : '80'}
      onBreakpoint={(breakpoint) => collapseSider(breakpoint)}
      trigger={null}
      collapsible
      collapsed={collapsed}
      // defaultCollapsed="true"
    >
      <div className="logo">
        <img src={logo} style={{ height: '100%' }} alt="Logo" />
        <h1 className={collapsed ? 'title inactive' : 'title active'}>
          City Energy Analyst
        </h1>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 'calc(100% - 90px)',
        }}
      >
        <Menu
          theme="dark"
          mode="vertical"
          defaultSelectedKeys={['projectOverview']}
          selectedKeys={[selectedKey]}
          style={{ width: '100%' }}
        >
          {selectedKey !== '/' && (
            <Menu.Item key={routes.PROJECT_OVERVIEW}>
              <span>
                <Icon type="project" />
                <span>Project Overview</span>
              </span>
              <Link to={routes.PROJECT_OVERVIEW} />
            </Menu.Item>
          )}

          <ScenarioMenuItem key={routes.DATABASE_EDITOR}>
            <Menu.Item>
              <span>
                <Icon type="database" />
                <span>Database Editor</span>
              </span>
              <Link to={routes.DATABASE_EDITOR} />
            </Menu.Item>
          </ScenarioMenuItem>
          <ScenarioMenuItem key={routes.INPUT_EDITOR}>
            <Menu.Item>
              <span>
                <Icon type="edit" />
                <span>Input Editor</span>
              </span>
              <Link to={routes.INPUT_EDITOR} />
            </Menu.Item>
          </ScenarioMenuItem>
          <ScenarioMenuItem>
            <ToolsMenu />
          </ScenarioMenuItem>

          <ScenarioMenuItem key={routes.DASHBOARD}>
            <Menu.Item>
              <span>
                <Icon type="bar-chart" />
                <span>Dashboard</span>
              </span>
              <Link to={routes.DASHBOARD} />
            </Menu.Item>
          </ScenarioMenuItem>
        </Menu>
        <Menu
          theme="dark"
          mode="vertical"
          style={{ width: '100%' }}
          selectedKeys={[]}
        >
          <SubMenu
            key="help"
            title={
              <span>
                <Icon type="question-circle" />
                <span>Help</span>
              </span>
            }
          >
            <Menu.Item
              key="blog-tutorials"
              onClick={() =>
                shell.openExternal('https://cityenergyanalyst.com/blog-1')
              }
            >
              <span>
                <Icon type="read" />
                <span>Blog Tutorials</span>
              </span>
            </Menu.Item>
            <Menu.Item
              key="documentation"
              onClick={() =>
                shell.openExternal(
                  'http://city-energy-analyst.readthedocs.io/en/latest/'
                )
              }
            >
              <span>
                <Icon type="book" />
                <span>Documentation</span>
              </span>
            </Menu.Item>
            <Menu.Item
              key="report-issue"
              onClick={() =>
                shell.openExternal(
                  'https://github.com/architecture-building-systems/cityenergyanalyst/issues/new'
                )
              }
            >
              <span>
                <Icon type="flag" />
                <span>Report an Issue</span>
              </span>
            </Menu.Item>
            <Menu.Item
              key="known-issue"
              onClick={() =>
                shell.openExternal(
                  'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues?utf8=%E2%9C%93&q=is%3Aopen%26closed+label%3A%22known+issue%22+'
                )
              }
            >
              <span>
                <Icon type="exception" />
                <span>Known Issues</span>
              </span>
            </Menu.Item>
          </SubMenu>
        </Menu>
      </div>
    </Sider>
  );
};

const ScenarioMenuItem = ({ children, ...props }) => {
  const scenarioName = useSelector((state) => state.project.info.scenario_name);
  if (scenarioName === null) return null;
  return React.Children.map(children, (child) =>
    React.cloneElement(child, { ...props })
  );
};

export default SideNav;
