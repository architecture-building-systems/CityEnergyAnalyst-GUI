import { Children, cloneElement, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  BarChartOutlined,
  BookOutlined,
  DatabaseOutlined,
  EditOutlined,
  ExceptionOutlined,
  FlagOutlined,
  ProjectOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
} from '@ant-design/icons';

import { Layout, Menu } from 'antd';
import ToolsMenu from './ToolsMenu';
import routes from '../../constants/routes';
import ceaLogo from '../../assets/cea-logo.png';
import { LayoutContext } from '../../containers/HomePage';

const { Sider } = Layout;
const { SubMenu } = Menu;

const SideNav = () => {
  const { location } = useSelector((state) => state.router);

  const { collapsed, setCollapsed } = useContext(LayoutContext);
  const [breakpoint, setBreakpoint] = useState(false);
  const [prevCollapsed, setPrevCollapsed] = useState(true);

  const selectedKey = location.pathname;

  const collapseSider = (breakpoint) => {
    if (breakpoint) {
      setPrevCollapsed(collapsed);
      if (!collapsed) {
        setCollapsed(true);
      }
    } else {
      setCollapsed(prevCollapsed);
    }
  };

  useEffect(() => {
    collapseSider(breakpoint);
  }, [breakpoint]);

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth={breakpoint ? '0' : '80'}
      onBreakpoint={setBreakpoint}
      trigger={null}
      collapsible
      collapsed={collapsed}
      hidden={breakpoint && collapsed}
    >
      <div className="logo">
        <img src={ceaLogo} alt="Logo" />
        <span className={collapsed ? 'title inactive' : 'title active'}>
          City Energy Analyst
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexGrow: 1,
        }}
      >
        <Menu
          theme="dark"
          mode="vertical"
          defaultSelectedKeys={['projectOverview']}
          selectedKeys={[selectedKey]}
        >
          {selectedKey !== '/' && (
            <Menu.Item key={routes.PROJECT_OVERVIEW}>
              <span>
                <ProjectOutlined />
                <span>Project Overview</span>
              </span>
              <Link to={routes.PROJECT_OVERVIEW} />
            </Menu.Item>
          )}

          <ScenarioMenuItem key={routes.DATABASE_EDITOR}>
            <Menu.Item>
              <span>
                <DatabaseOutlined />
                <span>Database Editor</span>
              </span>
              <Link to={routes.DATABASE_EDITOR} />
            </Menu.Item>
          </ScenarioMenuItem>
          <ScenarioMenuItem key={routes.INPUT_EDITOR}>
            <Menu.Item>
              <span>
                <EditOutlined />
                <span>Input Editor</span>
              </span>
              <Link to={routes.INPUT_EDITOR} />
            </Menu.Item>
          </ScenarioMenuItem>
          <ScenarioMenuItem key={routes.TOOLS}>
            <ToolsMenu />
          </ScenarioMenuItem>

          <ScenarioMenuItem key={routes.DASHBOARD}>
            <Menu.Item>
              <span>
                <BarChartOutlined />
                <span>Dashboard</span>
              </span>
              <Link to={routes.DASHBOARD} />
            </Menu.Item>
          </ScenarioMenuItem>
        </Menu>
        <Menu theme="dark" mode="vertical" selectedKeys={[]}>
          <SubMenu
            key="help"
            title={
              <span>
                <QuestionCircleOutlined />
                <span>Help</span>
              </span>
            }
          >
            <Menu.Item
              key="blog-tutorials"
              onClick={() =>
                window.open(
                  'https://cityenergyanalyst.com/blog-1',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              <span>
                <ReadOutlined />
                <span>Blog Tutorials</span>
              </span>
            </Menu.Item>
            <Menu.Item
              key="documentation"
              onClick={() =>
                window.open(
                  'http://city-energy-analyst.readthedocs.io/en/latest/',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              <span>
                <BookOutlined />
                <span>Documentation</span>
              </span>
            </Menu.Item>
            <Menu.Item
              key="report-issue"
              onClick={() =>
                window.open(
                  'https://github.com/architecture-building-systems/cityenergyanalyst/issues/new',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              <span>
                <FlagOutlined />
                <span>Report an Issue</span>
              </span>
            </Menu.Item>
            <Menu.Item
              key="known-issue"
              onClick={() =>
                window.open(
                  'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues?utf8=%E2%9C%93&q=is%3Aopen%26closed+label%3A%22known+issue%22+',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              <span>
                <ExceptionOutlined />
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
  return Children.map(children, (child) => cloneElement(child, { ...props }));
};

export default SideNav;
