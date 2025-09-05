import { DotChartOutlined } from '@ant-design/icons';
import {
  SolarRadiationIcon,
  NetworksIcon,
  PlugInIcon,
  EnergyPotentialsIcon,
  LifeCycleAnalysisIcon,
  ComfortChartIcon,
} from 'assets/icons';
import {
  DEMAND,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  THERMAL_NETWORK,
  LIFE_CYCLE_ANALYSIS,
  COMFORT_CHART,
  PARETO_FRONT,
} from 'features/map/constants';

export const iconMap = {
  [SOLAR_IRRADIATION]: SolarRadiationIcon,
  [THERMAL_NETWORK]: NetworksIcon,
  [DEMAND]: PlugInIcon,
  [RENEWABLE_ENERGY_POTENTIALS]: EnergyPotentialsIcon,
  [LIFE_CYCLE_ANALYSIS]: LifeCycleAnalysisIcon,
  [COMFORT_CHART]: ComfortChartIcon,
  [PARETO_FRONT]: DotChartOutlined,
};

// TODO: get mappings from backend
// Maps script name to map layer button name
export const VIEW_MAP_RESULTS = {
  demand: DEMAND,
  radiation: SOLAR_IRRADIATION,
  'radiation-crax': SOLAR_IRRADIATION,
  photovoltaic: RENEWABLE_ENERGY_POTENTIALS,
  'photovoltaic-thermal': RENEWABLE_ENERGY_POTENTIALS,
  'solar-collector': RENEWABLE_ENERGY_POTENTIALS,
  'thermal-network': THERMAL_NETWORK,
  emissions: LIFE_CYCLE_ANALYSIS,
};

// Maps script name to plot script name
export const VIEW_PLOT_RESULTS = {
  [DEMAND]: 'plot-demand',
  [SOLAR_IRRADIATION]: null,
  [RENEWABLE_ENERGY_POTENTIALS]: 'plot-solar',
  [THERMAL_NETWORK]: null,
  [LIFE_CYCLE_ANALYSIS]: null,
  [COMFORT_CHART]: 'plot-comfort-chart',
  [PARETO_FRONT]: 'plot-pareto-front',
};

export const PLOT_SCRIPTS = Object.values(VIEW_PLOT_RESULTS).filter(Boolean);
