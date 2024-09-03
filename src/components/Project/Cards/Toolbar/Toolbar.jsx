import {
  DatabaseOutlined,
  HomeOutlined,
  ToolOutlined,
  BarChartOutlined,
  DownOutlined,
  PartitionOutlined,
  PieChartOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  DeploymentUnitOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { Divider, Dropdown, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToolList } from '../../../../actions/tools';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import './Toolbar.css';

const useFetchTools = () => {
  const dispatch = useDispatch();
  const { status, tools } = useSelector((state) => state.toolList);

  useEffect(() => {
    dispatch(fetchToolList());
  }, []);

  return { status, tools };
};

const toolIconMap = {
  'Data management': <PartitionOutlined />,
  'Demand forecasting': <TeamOutlined />,
  'Energy potentials': <ThunderboltOutlined />,
  'Life cycle analysis': <PieChartOutlined />,
  Networks: <DeploymentUnitOutlined />,
  Optimization: <RadarChartOutlined />,
  Utilities: <ToolOutlined />,
};

const ToolMenu = ({ category, tools }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const items = tools.map((tool) => ({
    key: tool.name,
    label: (
      <Tooltip
        title={tool.description}
        placement="right"
        overlayInnerStyle={{ fontSize: 12 }}
      >
        <div style={{ width: '100%' }}>{tool.label}</div>
      </Tooltip>
    ),
  }));

  return (
    <Tooltip
      title={category}
      mouseEnterDelay={0.8}
      open={showTooltip}
      onOpenChange={setShowTooltip}
      overlayInnerStyle={{ fontSize: 12 }}
    >
      <Dropdown
        menu={{ items }}
        trigger={['click']}
        onOpenChange={() => setShowTooltip(false)}
      >
        <div className="cea-card-toolbar-icon">
          {toolIconMap?.[category] || <ToolOutlined />}

          <DownOutlined style={{ fontSize: 8, marginLeft: 4 }} />
        </div>
      </Dropdown>
    </Tooltip>
  );
};

const Toolbar = () => {
  const dispatch = useDispatch();
  const { status, tools } = useFetchTools();

  return (
    <div
      id="cea-card-toolbar"
      style={{
        display: 'flex',
        background: '#fff',
        height: 40,
        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        gap: 2,
        padding: 2,
      }}
    >
      <HomeOutlined className="cea-card-toolbar-icon" />
      <Divider className="cea-card-toolbar-divider" type="vertical" />
      <Tooltip title="Database Editor" overlayInnerStyle={{ fontSize: 12 }}>
        <DatabaseOutlined
          className="cea-card-toolbar-icon"
          onClick={() => dispatch(push(routes.DATABASE_EDITOR))}
        />
      </Tooltip>
      <Divider className="cea-card-toolbar-divider" type="vertical" />
      {status == 'fetching' ? (
        <div>Loading Tools</div>
      ) : (
        Object.keys(tools).map((category) => (
          <ToolMenu
            key={category}
            category={category}
            tools={tools?.[category]}
          />
        ))
      )}
      <Divider className="cea-card-toolbar-divider" type="vertical" />
      <Tooltip title="Plots" overlayInnerStyle={{ fontSize: 12 }}>
        <BarChartOutlined
          className="cea-card-toolbar-icon"
          onClick={() => dispatch(push(routes.DASHBOARD))}
        />
      </Tooltip>
    </div>
  );
};

export default Toolbar;
