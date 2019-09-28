import React from 'react';
import { Icon } from 'antd';
import './StatusBar.css';

const StatusBar = () => {
  return (
    <div
      style={{
        width: '100%',
        height: 24,
        color: 'white',
        backgroundColor: '#1890ff',
        display: 'flex',
        justifyContent: 'space-between'
      }}
    >
      <div className="cea-ticker" style={{ margin: '0 10px' }}>
        <text className="cea-ticker-text">Nothing Running</text>
      </div>
      <div style={{ margin: '0 10px' }}>
        <Icon className="cea-status-bar-buttons" type="bell" theme="filled" />
      </div>
    </div>
  );
};

export default StatusBar;
