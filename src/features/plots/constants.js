import { DotChartOutlined } from '@ant-design/icons';
import {
  SolarRadiationIcon,
  NetworksIcon,
  PlugInIcon,
  EnergyPotentialsIcon,
  LifeCycleAnalysisIcon,
  ComfortChartIcon,
  TimelineIcon,
  SupplySystemIcon,
  OptimisationIcon,
} from 'assets/icons';
import {
  DEMAND,
  FINAL_ENERGY,
  SOLAR_IRRADIATION,
  RENEWABLE_ENERGY_POTENTIALS,
  THERMAL_NETWORK,
  LIFE_CYCLE_ANALYSIS,
  COMFORT_CHART,
  PARETO_FRONT,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
  EMISSION_TIMELINE,
  PATHWAY_EMISSION_TIMELINE,
  SUPPLY_SYSTEM,
  COST_BREAKDOWN,
  COST_SANKEY,
  ANTHROPOGENIC_HEAT,
  ENERGY_SANKEY,
  LDC_COMPONENT,
} from 'features/map/constants';

export const iconMap = {
  [SOLAR_IRRADIATION]: SolarRadiationIcon,
  [THERMAL_NETWORK]: NetworksIcon,
  [DEMAND]: PlugInIcon,
  [FINAL_ENERGY]: LifeCycleAnalysisIcon,
  [RENEWABLE_ENERGY_POTENTIALS]: EnergyPotentialsIcon,
  [LIFE_CYCLE_ANALYSIS]: LifeCycleAnalysisIcon,
  [COMFORT_CHART]: ComfortChartIcon,
  [PARETO_FRONT]: DotChartOutlined,
  [EMISSIONS_EMBODIED]: LifeCycleAnalysisIcon,
  [EMISSIONS_OPERATIONAL]: LifeCycleAnalysisIcon,
  [EMISSION_TIMELINE]: TimelineIcon,
  [PATHWAY_EMISSION_TIMELINE]: TimelineIcon,
  [SUPPLY_SYSTEM]: SupplySystemIcon,
  [COST_BREAKDOWN]: LifeCycleAnalysisIcon,
  [COST_SANKEY]: LifeCycleAnalysisIcon,
  [ANTHROPOGENIC_HEAT]: LifeCycleAnalysisIcon,
  [ENERGY_SANKEY]: LifeCycleAnalysisIcon,
  [LDC_COMPONENT]: LifeCycleAnalysisIcon,
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
  'thermal-network-multiple-phase': THERMAL_NETWORK,
  emissions: LIFE_CYCLE_ANALYSIS,
};

// Maps layer name to plot script name
export const VIEW_PLOT_RESULTS = {
  [DEMAND]: 'plot-demand',
  [FINAL_ENERGY]: 'plot-final-energy',
  [SOLAR_IRRADIATION]: null,
  [RENEWABLE_ENERGY_POTENTIALS]: 'plot-solar',
  [THERMAL_NETWORK]: null,
  [COMFORT_CHART]: 'plot-comfort-chart',
  [PARETO_FRONT]: 'plot-pareto-front',
  [EMISSIONS_EMBODIED]: 'plot-lifecycle-emissions',
  [EMISSIONS_OPERATIONAL]: 'plot-operational-emissions',
  [EMISSION_TIMELINE]: 'plot-emission-timeline',
  [PATHWAY_EMISSION_TIMELINE]: 'plot-pathway-emission-timeline',
  [SUPPLY_SYSTEM]: 'plot-supply-system',
  [COST_BREAKDOWN]: 'plot-cost-breakdown',
  [COST_SANKEY]: 'plot-cost-sankey',
  [ANTHROPOGENIC_HEAT]: 'plot-heat-rejection',
  [ENERGY_SANKEY]: 'plot-energy-sankey',
  [LDC_COMPONENT]: 'plot-ldc-component',
};

export const PLOT_SCRIPTS = Object.values(VIEW_PLOT_RESULTS).filter(Boolean);

// Labels matching scripts.yml (without the "Plot - " prefix)
export const PLOT_LABELS = {
  [DEMAND]: 'Building Energy Demand',
  [FINAL_ENERGY]: 'Energy by Carrier',
  [RENEWABLE_ENERGY_POTENTIALS]: 'Solar Technology',
  [COMFORT_CHART]: 'Building Comfort Chart',
  [PARETO_FRONT]: 'Pareto Front',
  [EMISSIONS_EMBODIED]: 'Lifecycle Emissions',
  [EMISSIONS_OPERATIONAL]: 'Operational Emissions',
  [EMISSION_TIMELINE]: 'Emission Timeline',
  [SUPPLY_SYSTEM]: 'Supply System',
  [COST_BREAKDOWN]: 'Cost Breakdown',
  [COST_SANKEY]: 'System Cost Sankey',
  [ANTHROPOGENIC_HEAT]: 'Anthropogenic Heat Rejection',
  [ENERGY_SANKEY]: 'Energy Flow Sankey',
  [LDC_COMPONENT]: 'Load Duration Curve by Component',
};

// Groups matching top-level feature categories in scripts.yml.
// A group may have `keys` (flat list) or `subgroups` (nested sub-features).
export const PLOT_GROUPS = [
  {
    label: 'Energy Demand Forecasting',
    icon: iconMap[DEMAND],
    keys: [DEMAND, COMFORT_CHART],
  },
  {
    label: 'Renewable Energy Potential Assessment',
    icon: iconMap[RENEWABLE_ENERGY_POTENTIALS],
    keys: [RENEWABLE_ENERGY_POTENTIALS],
  },
  {
    label: 'Life Cycle Analysis',
    icon: iconMap[FINAL_ENERGY],
    subgroups: [
      {
        label: 'Energy by Carrier',
        keys: [FINAL_ENERGY, ENERGY_SANKEY, LDC_COMPONENT],
      },
      {
        label: 'GHG Emissions',
        keys: [EMISSIONS_EMBODIED, EMISSIONS_OPERATIONAL, EMISSION_TIMELINE],
      },
      { label: 'Costs', keys: [COST_BREAKDOWN, COST_SANKEY] },
      { label: 'Heat Rejection', keys: [ANTHROPOGENIC_HEAT] },
    ],
  },
  {
    label: 'Energy Supply System Optimisation',
    icon: OptimisationIcon,
    keys: [PARETO_FRONT, SUPPLY_SYSTEM],
  },
];
