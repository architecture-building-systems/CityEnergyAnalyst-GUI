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
// Maps script name to a "View Results" target. Each entry can specify any
// of:
//   - `category`: the parent map-layer category to switch to (optional).
//   - `layer`:    the specific layer name to auto-select within `category`
//                 (optional; ignored when `category` is missing).
//   - `plot`:     the plot script whose configuration form should open
//                 (optional). Opens the FORM only — does not auto-run.
// At least one of these must be present, or the script should not appear
// in the table. String shorthand `'category-name'` is still accepted for
// back-compat with older entries that pre-date the object schema.
export const VIEW_MAP_RESULTS = {
  demand: { category: DEMAND, layer: DEMAND },
  radiation: { category: SOLAR_IRRADIATION, layer: SOLAR_IRRADIATION },
  'radiation-crax': { category: SOLAR_IRRADIATION, layer: SOLAR_IRRADIATION },
  photovoltaic: { category: RENEWABLE_ENERGY_POTENTIALS },
  'photovoltaic-thermal': { category: RENEWABLE_ENERGY_POTENTIALS },
  'solar-collector': { category: RENEWABLE_ENERGY_POTENTIALS },
  'thermal-network': { category: THERMAL_NETWORK },
  'thermal-network-multiple-phase': { category: THERMAL_NETWORK },
  // Life Cycle Analysis features — single "View Results" button opens
  // both the deep-linked map layer AND the corresponding plot form so
  // the user can configure & run the plot in the same click.
  // `system-costs` has no per-cost map layer, so it just opens the plot
  // form (and stays on whatever map view is currently active).
  'final-energy': {
    category: LIFE_CYCLE_ANALYSIS,
    layer: FINAL_ENERGY,
    plot: 'plot-energy-sankey',
  },
  emissions: {
    category: LIFE_CYCLE_ANALYSIS,
    layer: EMISSIONS_EMBODIED,
    plot: 'plot-lifecycle-emissions',
  },
  'system-costs': { plot: 'plot-cost-breakdown' },
  'anthropogenic-heat': {
    category: LIFE_CYCLE_ANALYSIS,
    layer: ANTHROPOGENIC_HEAT,
    plot: 'plot-heat-rejection',
  },
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

// Maps script name to a plot tool script to open on completion
export const VIEW_TOOL_RESULTS = {
  'pathway-simulations': 'plot-pathway-emission-timeline',
};

// Build a prefill patch for the target plot form from a completed job's
// parameters. Returns null when nothing worth seeding is available.
export const buildPlotToolPrefillFromJob = (job) => {
  if (!job?.parameters) return null;
  if (job.script === 'pathway-simulations') {
    const name = job.parameters['existing-pathway-name'];
    if (!name) return null;
    return { 'existing-pathway-names': [name] };
  }
  return null;
};

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
  [PATHWAY_EMISSION_TIMELINE]: 'Pathway Emission Timeline',
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
        keys: [
          EMISSIONS_EMBODIED,
          EMISSIONS_OPERATIONAL,
          EMISSION_TIMELINE,
          PATHWAY_EMISSION_TIMELINE,
        ],
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
