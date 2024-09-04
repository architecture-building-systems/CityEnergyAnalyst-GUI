import {
  DatabaseOutlined,
  ToolOutlined,
  BarChartOutlined,
  DownOutlined,
  PartitionOutlined,
  PieChartOutlined,
  ThunderboltOutlined,
  EditOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { Divider, Dropdown, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToolList } from '../../../../actions/tools';
import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import './Toolbar.css';
import { useHoverGrow } from '../OverviewCard/hooks';

import { animated } from '@react-spring/web';

const useFetchTools = () => {
  const dispatch = useDispatch();
  const { status, tools } = useSelector((state) => state.toolList);

  useEffect(() => {
    dispatch(fetchToolList());
  }, []);

  return { status, tools };
};

export function FluentBuildingPeople20Regular(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 20 20"
      {...props}
    >
      <path
        fill="currentColor"
        d="M6.75 9.5a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5m3-3a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5M4 17.5a.5.5 0 0 0 .5.5h4.796a3.3 3.3 0 0 1-.273-1H5V3.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v5a.5.5 0 0 0 .5.5h2a.5.5 0 0 1 .5.5v.863c.2.21.365.453.49.719q.23-.208.51-.348V9.5A1.5 1.5 0 0 0 14.5 8H13V3.5A1.5 1.5 0 0 0 11.5 2h-6A1.5 1.5 0 0 0 4 3.5zm2.75-5a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5m3.75-3.75a.75.75 0 1 1-1.5 0a.75.75 0 0 1 1.5 0M6.75 6.5a.75.75 0 1 0 0-1.5a.75.75 0 0 0 0 1.5m8 5.75a1.75 1.75 0 1 1-3.5 0a1.75 1.75 0 0 1 3.5 0m3.5.5a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 0 1 2.5 0M16 16.6c0 1.183-.8 2.4-3 2.4s-3-1.216-3-2.4a1.6 1.6 0 0 1 1.6-1.6h2.8a1.6 1.6 0 0 1 1.6 1.6m.704 1.4h.046c1.65 0 2.25-.912 2.25-1.8a1.2 1.2 0 0 0-1.2-1.2h-1.35c.345.441.55.997.55 1.6a3.4 3.4 0 0 1-.296 1.4"
      ></path>
    </svg>
  );
}

export function StreamlineOfficeBuilding1(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 14 14"
      {...props}
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.461 4.75V1.594c0-.56-.454-1.015-1.015-1.015h-4.79c-.562 0-1.016.454-1.016 1.015v11.827m-1.121 0h4.968M1.64 3.187H4.1M1.64 5.75h3.847m4.993 4.282a1.75 1.75 0 1 0 0-3.5a1.75 1.75 0 0 0 0 3.5m-3.001 3.389a3.04 3.04 0 0 1 .39-1.46a3.03 3.03 0 0 1 2.611-1.537a3.03 3.03 0 0 1 2.612 1.538c.25.445.385.947.39 1.459"
      ></path>
    </svg>
  );
}

export function CarbonChartNetwork(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 32 32"
      {...props}
    >
      <path
        fill="black"
        d="M26 14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v4.1a5 5 0 0 0-3.9 3.9H14v-2a2 2 0 0 0-2-2h-2v-4.1a5 5 0 1 0-2 0V18H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2h4.1a5 5 0 1 0 5.9-5.9V14ZM6 9a3 3 0 1 1 3 3a3 3 0 0 1-3-3m6 17H6v-6h6Zm14-3a3 3 0 1 1-3-3a3 3 0 0 1 3 3M20 6h6v6h-6Z"
      ></path>
    </svg>
  );
}

export function GrommetIconsOptimize(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="none"
        stroke="black"
        strokeWidth={2}
        d="M2 22h4v-4H2zM22 2L12 12m10-2V2h-8m8 11h-4v9h4zm-12 9h4v-6h-4z"
      ></path>
    </svg>
  );
}

const toolIconMap = {
  'Data management': <PartitionOutlined />,
  'Solar radiation': <SunOutlined />,
  'Demand forecasting': <StreamlineOfficeBuilding1 />,
  'Energy potentials': <ThunderboltOutlined />,
  'Life cycle analysis': <PieChartOutlined />,
  Networks: <CarbonChartNetwork />,
  Optimization: <GrommetIconsOptimize />,
  Utilities: <ToolOutlined />,
};

const ToolMenu = ({
  category,
  tools,
  onToolSelected,
  showTooltip,
  onMenuOpenChange,
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();

  const items = useMemo(
    () =>
      tools.map((tool) => ({
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
      })),
    [tools],
  );

  useEffect(() => {
    setTooltipVisible(false);
  }, [showTooltip]);

  return (
    <Tooltip
      title={showTooltip ? category : ''}
      overlayInnerStyle={{ fontSize: 12 }}
      open={showTooltip && tooltipVisible}
      onOpenChange={setTooltipVisible}
    >
      <Dropdown
        menu={{ items, onClick: ({ key }) => onToolSelected(key) }}
        trigger={['click']}
        onOpenChange={onMenuOpenChange}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="cea-card-toolbar-icon">
          {toolIconMap?.[category] || <ToolOutlined />}
          <animated.div style={styles}>
            <DownOutlined style={{ fontSize: 8, marginLeft: 4 }} />
          </animated.div>
        </div>
      </Dropdown>
    </Tooltip>
  );
};

const Toolbar = ({ onToolSelected, onOpenInputEditor, showTools }) => {
  const dispatch = useDispatch();
  const { status, tools } = useFetchTools();

  const [showTooltip, setShowTooltip] = useState(true);

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
      {/* <HomeOutlined className="cea-card-toolbar-icon" />
      <Divider className="cea-card-toolbar-divider" type="vertical" /> */}
      {showTools && (
        <>
          <Tooltip title="Database Editor" overlayInnerStyle={{ fontSize: 12 }}>
            <DatabaseOutlined
              className="cea-card-toolbar-icon"
              onClick={() => dispatch(push(routes.DATABASE_EDITOR))}
            />
          </Tooltip>
          <Tooltip title="Input Editor" overlayInnerStyle={{ fontSize: 12 }}>
            <EditOutlined
              className="cea-card-toolbar-icon"
              onClick={() => onOpenInputEditor?.()}
            />
          </Tooltip>
          <Divider className="cea-card-toolbar-divider" type="vertical" />
        </>
      )}
      {status == 'fetching' ? (
        <div>Loading Tools</div>
      ) : (
        showTools && (
          <>
            {Object.keys(tools).map((category) => (
              <ToolMenu
                key={category}
                category={category}
                tools={tools?.[category]}
                onToolSelected={onToolSelected}
                showTooltip={showTooltip}
                onMenuOpenChange={(value) => setShowTooltip(!value)}
              />
            ))}
            <Divider className="cea-card-toolbar-divider" type="vertical" />
          </>
        )
      )}
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
