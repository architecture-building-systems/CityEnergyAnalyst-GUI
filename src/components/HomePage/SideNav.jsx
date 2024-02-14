import { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  ToolOutlined,
} from '@ant-design/icons';

import { Layout, Menu, Tooltip } from 'antd';
import routes from '../../constants/routes';
import ceaLogo from '../../assets/cea-logo.png';
import { LayoutContext } from '../../containers/HomePage';
import { fetchToolList } from '../../actions/tools';

const { Sider } = Layout;

const useFetchTools = () => {
  const dispatch = useDispatch();
  const { status, tools } = useSelector((state) => state.toolList);

  useEffect(() => {
    dispatch(fetchToolList());
  }, []);

  return { status, tools };
};

const SideNav = () => {
  const { pathname: selectedKey } = useSelector(
    (state) => state.router.location
  );
  const scenarioName = useSelector((state) => state.project.info.scenario_name);

  const { collapsed, setCollapsed } = useContext(LayoutContext);
  const [breakpoint, setBreakpoint] = useState(false);
  const [prevCollapsed, setPrevCollapsed] = useState(true);

  const { status, tools } = useFetchTools();

  const _scenarioMenuItems =
    scenarioName !== null
      ? scenarioMenuItems(toolMenuItems(status, tools))
      : [];

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
          selectedKeys={[selectedKey]}
          items={[...projectMenuItems(), ..._scenarioMenuItems]}
        />

        <Menu
          theme="dark"
          mode="vertical"
          selectedKeys={[]}
          items={helpMenuItems()}
        />
      </div>
    </Sider>
  );
};

const projectMenuItems = () => {
  return [
    {
      label: <Link to={routes.PROJECT_OVERVIEW}>Project Overview</Link>,
      key: routes.PROJECT_OVERVIEW,
      icon: <ProjectOutlined />,
    },
  ];
};

const scenarioMenuItems = (toolsMenu) => {
  return [
    {
      label: <Link to={routes.DATABASE_EDITOR}>Database Editor</Link>,
      key: routes.DATABASE_EDITOR,
      icon: <DatabaseOutlined />,
    },
    {
      label: <Link to={routes.INPUT_EDITOR}>Input Editor</Link>,
      key: routes.INPUT_EDITOR,
      icon: <EditOutlined />,
    },
    toolsMenu,
    {
      label: <Link to={routes.DASHBOARD}>Dashboard</Link>,
      key: routes.DASHBOARD,
      icon: <BarChartOutlined />,
    },
  ];
};

const toolMenuItems = (status, tools) => {
  var children = [];

  if (status == 'fetching')
    children = [
      {
        label: 'Fetching Tools...',
        key: 'no-tools',
      },
    ];
  else if (status == 'failed')
    children = [
      {
        label: 'Error Fetching Tools',
        key: 'no-tools',
      },
    ];
  else if (Object.keys(tools).length) {
    const toolCategoryList = Object.keys(tools).map((category) => {
      return {
        label: category,
        key: category,
        children: tools[category].map(({ name, label, description }) => ({
          label: (
            <Tooltip
              title={description}
              placement="right"
              overlayStyle={{ paddingLeft: 12 }}
              color="rgb(80,80,80)"
            >
              <Link to={`${routes.TOOLS}/${name}`}>
                <div>{label}</div>
              </Link>
            </Tooltip>
          ),
          key: name,
        })),
      };
    });

    children = toolCategoryList;
  } else
    children = [
      {
        label: 'No Tools Found',
        key: 'no-tools',
      },
    ];

  return {
    label: 'Tools',
    key: routes.TOOLS,
    icon: <ToolOutlined />,
    children,
  };
};

const helpMenuItems = () => {
  return [
    {
      label: 'Help',
      key: 'help',
      icon: <QuestionCircleOutlined />,
      children: [
        {
          label: (
            <span
              onClick={() =>
                window.open(
                  'https://www.cityenergyanalyst.com/blog',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              Blog Tutorials
            </span>
          ),
          key: 'blog-tutorials',
          icon: <ReadOutlined />,
        },
        {
          label: (
            <span
              onClick={() =>
                window.open(
                  'http://city-energy-analyst.readthedocs.io/en/latest/',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              Documentation
            </span>
          ),
          key: 'documentation',
          icon: <BookOutlined />,
        },
        {
          label: (
            <span
              onClick={() =>
                window.open(
                  'https://github.com/architecture-building-systems/cityenergyanalyst/issues/new',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              Report an Issue
            </span>
          ),
          key: 'report-issue',
          icon: <FlagOutlined />,
        },
        {
          label: (
            <span
              onClick={() =>
                window.open(
                  'https://github.com/architecture-building-systems/CityEnergyAnalyst/issues?utf8=%E2%9C%93&q=is%3Aopen%26closed+label%3A%22known+issue%22+',
                  '_blank',
                  'noreferrer'
                )
              }
            >
              Known Issues
            </span>
          ),
          key: 'known-issue',
          icon: <ExceptionOutlined />,
        },
      ],
    },
  ];
};

export default SideNav;
