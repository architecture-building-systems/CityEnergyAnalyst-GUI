import { useSelector } from 'react-redux';
import { Layout } from 'antd';
import SearchBar from './Searchbar';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { LayoutContext } from '../../containers/HomePage';

const { Header: AntHeader } = Layout;

const Header = () => {
  const { project_name: projectName, scenario_name: scenarioName } =
    useSelector((state) => state.project.info);
  const { pathname } = useSelector((state) => state.router.location);

  const { collapsed, setCollapsed } = useContext(LayoutContext);

  const CollapseButton = () => {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 18,
        }}
      >
        {collapsed ? (
          <MenuUnfoldOutlined
            style={{ padding: 18 }}
            onClick={() => {
              setCollapsed(false);
            }}
          />
        ) : (
          <MenuFoldOutlined
            style={{ padding: 18 }}
            onClick={() => {
              setCollapsed(true);
            }}
          />
        )}
      </div>
    );
  };

  return (
    <AntHeader
      className="cea-home-header"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        background: '#fff',
        position: 'fixed',
        padding: 0,
        width: '100%',
        zIndex: 7,
        boxShadow: '0 3px 4px -6px black',
      }}
    >
      <div className="cea-home-header-left" style={{ display: 'flex' }}>
        <CollapseButton />
        {pathname !== '/' && (
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              lineHeight: 'initial',
            }}
          >
            <span>
              <i>Current Project: </i>
              <b>{projectName}</b>
            </span>
            <span>
              <i>Scenario: </i>
              <b>{scenarioName}</b>
            </span>
          </span>
        )}
      </div>
      <div className="cea-home-header-right">
        <SearchBar />
      </div>
    </AntHeader>
  );
};

export default Header;
