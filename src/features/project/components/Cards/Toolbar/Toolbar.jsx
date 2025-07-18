import { Dropdown, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import useToolsStore from 'features/tools/stores/toolsStore';

import { DownOutlined } from '@ant-design/icons';

import './Toolbar.css';

import {
  DataManagementIcon,
  SolarRadiationIcon,
  OptimisationIcon,
  UtilitiesIcon,
  EnergyPotentialsIcon,
  LifeCycleAnalysisIcon,
  NetworksIcon,
  ImportExportIcon,
  PlugInIcon,
  NumberCircleIcon,
  AiIcon,
  ProIcon,
} from 'assets/icons';

const IGNORED_SECTIONS = ['Visualisation'];

const useFetchTools = () => {
  const { toolList, fetchToolList } = useToolsStore();
  const { status, tools } = toolList;

  useEffect(() => {
    fetchToolList();
  }, [fetchToolList]);

  return { status, tools };
};

const FALLBACK_ICON = <NumberCircleIcon number={'?'} />;
const toolIconMap = {
  'Data Management': <DataManagementIcon />,
  'Solar Radiation Analysis': <SolarRadiationIcon />,
  'Energy Demand Forecasting': <PlugInIcon />,
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
  customIcon,
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const icon = customIcon || toolIconMap?.[category] || FALLBACK_ICON;

  const items = useMemo(
    () =>
      tools.map((tool) => ({
        key: tool.name,
        label: (
          <Tooltip title={tool?.short_description} placement="right">
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
      open={showTooltip && tooltipVisible}
      onOpenChange={setTooltipVisible}
    >
      <div>
        <Dropdown
          menu={{ items, onClick: ({ key }) => onToolSelected(key) }}
          trigger={['click']}
          onOpenChange={onMenuOpenChange}
        >
          <div
            className="cea-card-toolbar-icon"
            style={{ display: 'flex', gap: 8 }}
          >
            {icon}
            <DownOutlined style={{ fontSize: 8 }} />
          </div>
        </Dropdown>
      </div>
    </Tooltip>
  );
};

const CEACopilot = () => {
  return (
    <Tooltip
      title={
        <div>
          CEA Copilot <br /> [Under Development]
        </div>
      }
    >
      <div className="cea-card-toolbar-icon">
        <AiIcon />
      </div>
    </Tooltip>
  );
};

const CEAInsights = () => {
  return (
    <Tooltip
      title={
        <div>
          CEA Insights <br /> [Under Development]
        </div>
      }
    >
      <div className="cea-card-toolbar-icon">
        <ProIcon />
        <DownOutlined style={{ marginLeft: 4, fontSize: 8 }} />
      </div>
    </Tooltip>
  );
};

const Toolbar = ({ onToolSelected }) => {
  const { status, tools } = useFetchTools();

  const [showTooltip, setShowTooltip] = useState(true);

  const toolMenus = useMemo(() => {
    return Object.keys(tools).map((category) => {
      if (IGNORED_SECTIONS.includes(category)) return null;

      return (
        <ToolMenu
          key={category}
          category={category}
          tools={tools?.[category]}
          onToolSelected={onToolSelected}
          showTooltip={showTooltip}
          onMenuOpenChange={(value) => setShowTooltip(!value)}
        />
      );
    });
  }, [tools, showTooltip, onToolSelected]);

  if (status == 'fetching') return <div>Loading Tools...</div>;

  return (
    <div
      id="cea-card-toolbar"
      className="cea-overlay-card cea-card-toolbar-icon-container"
    >
      {toolMenus}

      <CEAInsights />
      <div style={{ width: 1, background: '#eee', margin: '8px 4px' }} />
      <CEACopilot />
    </div>
  );
};

export default Toolbar;
