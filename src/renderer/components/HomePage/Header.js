import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Layout, Icon } from 'antd';
import SearchBar from './Searchbar';
import { setCollapsed } from '../../actions/homepage';

const { Header: AntHeader } = Layout;

const Header = () => {
  const { collapsed } = useSelector((state) => state.sider);
  const {
    project_name: projectName,
    scenario_name: scenarioName,
  } = useSelector((state) => state.project.info);
  const { pathname } = useSelector((state) => state.router.location);
  const dispatch = useDispatch();

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
        <Icon
          className="trigger menu-toggle"
          type={collapsed ? 'menu-unfold' : 'menu-fold'}
          onClick={() => dispatch(setCollapsed(!collapsed))}
        />
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
      <div
        className="cea-home-header-right"
        style={{ width: '30%', marginRight: collapsed ? 125 : 300 }}
      >
        <SearchBar />
      </div>
    </AntHeader>
  );
};

export default Header;
