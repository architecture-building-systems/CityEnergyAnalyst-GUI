import { useSelector } from 'react-redux';
import SearchBar from './Searchbar/SearchBar';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { LayoutContext } from '../../containers/HomePage';

const Header = () => {
  const { project_name: projectName, scenario_name: scenarioName } =
    useSelector((state) => state.project.info);
  const { pathname } = useSelector((state) => state.router.location);

  const { collapsed, setCollapsed } = useContext(LayoutContext);

  const CollapseButton = () => {
    return (
      <div
        style={{
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
    <div
      className="cea-home-header"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%',
        boxShadow: '0 3px 4px -6px black',
      }}
    >
      <div
        className="cea-home-header-left"
        style={{ display: 'flex', alignItems: 'center' }}
      >
        <CollapseButton />
        {pathname !== '/' && (
          <div style={{ fontSize: 14 }}>
            <div>
              <i>Current Project: </i>
              <b>{projectName}</b>
            </div>
            <div>
              <i>Scenario: </i>
              <b>{scenarioName}</b>
            </div>
          </div>
        )}
      </div>
      <div className="cea-home-header-right">
        <SearchBar />
      </div>
    </div>
  );
};

export default Header;
