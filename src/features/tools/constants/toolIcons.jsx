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
} from 'assets/icons';

export const TOOL_FALLBACK_ICON = <NumberCircleIcon number={'?'} />;

export const TOOL_ICON_MAP = {
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

export const IGNORED_TOOL_SECTIONS = ['Visualisation'];
