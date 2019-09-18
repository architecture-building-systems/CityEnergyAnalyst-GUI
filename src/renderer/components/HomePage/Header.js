import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Layout, Icon } from 'antd';
import { setCollapsed } from '../../actions/homepage';
import { getProject } from '../../actions/project';

const { Header: AntHeader } = Layout;

const Header = () => {
  const { collapsed } = useSelector(state => state.sider);
  const { name, scenario } = useSelector(state => state.project.info);
  const dispatch = useDispatch();

  return (
    <AntHeader
      style={{
        display: 'flex',
        background: '#fff',
        position: 'fixed',
        padding: 0,
        width: '100%',
        zIndex: 7,
        boxShadow: '0 3px 4px -6px black'
      }}
    >
      <Icon
        className="trigger menu-toggle"
        type={collapsed ? 'menu-unfold' : 'menu-fold'}
        onClick={() => dispatch(setCollapsed(!collapsed))}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <text style={{ lineHeight: 'initial' }}>Project: {name}</text>
        <text style={{ lineHeight: 'initial' }}>Scenario: {scenario}</text>
      </div>
    </AntHeader>
  );
};

export default Header;
