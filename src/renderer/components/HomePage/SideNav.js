import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  const dispatch = useDispatch();

  const [broken, setBroken] = useState(false);
  const [prevCollapsed, setPrevCollapsed] = useState(true);

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
      <Menu
        theme="dark"
        mode="vertical"
        defaultSelectedKeys={['projectOverview']}
        style={{ width: '100%' }}
      >
        <SubMenu
          key="projectManagement"
          title={
            <span>
              <Icon type="project" />
              <span>Project Management</span>
            </span>
          }
        >
          <Menu.Item key="projectOverview">
            <span>Project Overview</span>
            <Link to={routes.HOME} />
          </Menu.Item>
          <Menu.Item key="openProject">
            <span>Open Project</span>
            <Link to={routes.HOME} />
          </Menu.Item>
          <Menu.Item key="openScenario">
            <span>Open Scenario</span>
            <Link to={routes.HOME} />
          </Menu.Item>
        </SubMenu>
        <SubMenu
          key="inputEditor"
          title={
            <span>
              <Icon type="edit" />
              <span>Input Editor</span>
            </span>
          }
        >
          <Menu.Item key="buildingProperties">
            <span>Building Properties</span>
            <Link to="/test" />
          </Menu.Item>
          <Menu.Item key="test">
            <span>Test123</span>
            <Link to={routes.INPUT_EDITOR} />
          </Menu.Item>
        </SubMenu>
        <ToolsMenu />
      </Menu>
    </Sider>
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
