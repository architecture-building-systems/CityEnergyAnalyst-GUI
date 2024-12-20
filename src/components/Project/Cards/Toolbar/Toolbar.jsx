import { Dropdown, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToolList } from '../../../../actions/tools';

import { DownOutlined } from '@ant-design/icons';

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
  ImportExportIcon,
  PlugInIcon,
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
  'Data Management': <DataManagementIcon />,
  'Solar Radiation Analysis': <SolarRadiationIcon />,
  'Energy Demand Forecasting': <DemandForecastingIcon />,
  'Renewable Energy Potential Assessment': <EnergyPotentialsIcon />,
  'Life Cycle Analysis': <LifeCycleAnalysisIcon />,
  'Thermal Network Design': <NetworksIcon />,
  'Energy Supply System Optimisation': <OptimisationIcon />,
  Utilities: <UtilitiesIcon />,
  'Import & Export': <ImportExportIcon />,
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

  const icon = toolIconMap?.[category] || <PlugInIcon />;

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
            <div style={{ width: '100%', display: 'flex', gap: 10 }}>
              <span>-</span>
              {tool.label}
            </div>
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
            <DownOutlined style={{ marginLeft: 4, fontSize: 8 }} />
          </animated.div>
        </div>
      </Dropdown>
    </Tooltip>
  );
};

const Toolbar = ({ onToolSelected, showTools }) => {
  const { status, tools } = useFetchTools();

  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <div
      id="cea-card-toolbar"
      className="cea-overlay-card"
      style={{
        display: 'flex',
        background: '#000',
        borderRadius: 12,
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

        height: 'fit-content',

        gap: 2,
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
