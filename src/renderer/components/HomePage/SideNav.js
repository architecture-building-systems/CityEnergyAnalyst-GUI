import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { shell } from 'electron';
import { Link } from 'react-router-dom';
import { Layout, Menu, Icon } from 'antd';
import { setCollapsed } from '../../actions/homepage';
import ToolsMenu from './ToolsMenu';
import logo from './cea-logo.png';
import routes from '../../constants/routes';

const { Sider } = Layout;
const { SubMenu } = Menu;

const SideNav = () => {
  const { collapsed } = useSelector(state => state.sider);
  const { location } = useSelector(state => state.router);
  const dispatch = useDispatch();

  const [broken, setBroken] = useState(false);
  const [prevCollapsed, setPrevCollapsed] = useState(true);

  const selectedKey = location.pathname;

  const collapseSider = breakpoint => {
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
      onBreakpoint={breakpoint => collapseSider(breakpoint)}
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
          height: 'calc(100% - 90px)'
        }}
      >
        <Menu
          theme="dark"
          mode="vertical"
          defaultSelectedKeys={['projectOverview']}
          selectedKeys={[selectedKey]}
          style={{ width: '100%' }}
        >
          <Menu.Item key={routes.PROJECT_OVERVIEW}>
            <span>
              <Icon type="project" />
              <span>Project Overview</span>
            </span>
            <Link to={routes.PROJECT_OVERVIEW} />
          </Menu.Item>

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
  const { scenario } = useSelector(state => state.project.info);
  if (scenario === '') return null;
  return React.Children.map(children, child =>
    React.cloneElement(child, { ...props })
  );
};

// <Menu
//   theme="dark"
//   mode="inline"
//   style={{ marginTop: 60 }} //, position: 'absolute', bottom: 200 }}
// >
//   <SubMenu
//     key="help"
//     title={
//       <span>
//         <Icon type="info-circle" />
//         <span>Help</span>
//       </span>
//     }
//   >
//     <Menu.Item key="Help">
//       <Icon type="read" />
//       <span>Docs</span>
//     </Menu.Item>
//   </SubMenu>
// </Menu>

export default SideNav;
