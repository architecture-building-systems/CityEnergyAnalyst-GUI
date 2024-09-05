import { Dropdown, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToolList } from '../../../../actions/tools';

import { ToolOutlined, DownOutlined } from '@ant-design/icons';

import './Toolbar.css';
import { useHoverGrow } from '../OverviewCard/hooks';

import { animated } from '@react-spring/web';

import {
  DataManagementIcon,
  SolarRadiationIcon,
  DemandForecastingIcon,
  OptimisationIcon,
  UtilitiesIcon,
  EnergyPotentialsIcon,
  LifeCycleAnalysisIcon,
  NetworksIcon,
} from '../../../../assets/icons';

const useFetchTools = () => {
  const dispatch = useDispatch();
  const { status, tools } = useSelector((state) => state.toolList);

  useEffect(() => {
    dispatch(fetchToolList());
  }, []);

  return { status, tools };
};

const toolIconMap = {
  'Data management': <DataManagementIcon />,
  'Solar radiation': <SolarRadiationIcon />,
  'Demand forecasting': <DemandForecastingIcon />,
  'Energy potentials': <EnergyPotentialsIcon />,
  'Life cycle analysis': <LifeCycleAnalysisIcon />,
  Networks: <NetworksIcon />,
  Optimization: <OptimisationIcon />,
  Utilities: <UtilitiesIcon />,
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

  const icon = toolIconMap?.[category] || <ToolOutlined />;

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
          {icon}
          <animated.div style={styles}>
            <DownOutlined style={{ fontSize: 8, marginLeft: 4 }} />
          </animated.div>
        </div>
      </Dropdown>
    </Tooltip>
  );
};

const Toolbar = ({ onToolSelected, showTools }) => {
  const dispatch = useDispatch();
  const { status, tools } = useFetchTools();

  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <div
      id="cea-card-toolbar"
      style={{
        display: 'flex',
        background: '#000',
        height: 40,
        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        gap: 2,
        padding: 2,
      }}
    >
      {/* <HomeOutlined className="cea-card-toolbar-icon" />
      <Divider className="cea-card-toolbar-divider" type="vertical" /> */}
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
          </>
        )
      )}
    </div>
  );
};

export default Toolbar;