import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider, Divider, Form } from 'antd';
import { CEA_PURPLE } from 'constants/theme';
import { useCallback, useEffect, useRef } from 'react';
import { useMapStore, useSelectedMapLayer } from 'features/map/stores/mapStore';
import {
  useSelectedPlotToolSeed,
  useToolCardStore,
} from 'features/project/stores/tool-card';
import {
  DEMAND,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
  FINAL_ENERGY,
  RENEWABLE_ENERGY_POTENTIALS,
} from 'features/map/constants';
import {
  VIEW_PLOT_RESULTS,
  PLOT_LABELS,
  PLOT_GROUPS,
} from 'features/plots/constants';
import './tool-choices.css';

// Both the plot forms and the map layers now use snake_case display
// names as their values (see [plots-*] in default.config and the
// EnergyByCarrier / OperationalEmissions map layers). The seed paths
// below pass the map's `data-column` through unchanged, filtering only
// for values that the destination plot form can actually accept.
const PLOT_FINAL_ENERGY_CARRIERS = new Set([
  'grid_electricity',
  'natural_gas',
  'oil',
  'coal',
  'wood',
]);
const PLOT_DEMAND_SERVICES = new Set([
  'electricity',
  'space_heating',
  'space_cooling',
  'domestic_hot_water',
]);
const PLOT_SOLAR_SURFACES = new Set([
  'roofs_top',
  'walls_north',
  'walls_east',
  'walls_south',
  'walls_west',
]);
// PVT on the Renewable Energy Potentials map layer encodes the PV + SC pair
// as a single compound dropdown value. Kept in sync with
// `_PVT_PANEL_TYPE_SEP` in the backend layer class.
const PVT_PANEL_TYPE_SEP = ' + ';

const PlotButton = ({ plotKey, onSelected }) => {
  const script = VIEW_PLOT_RESULTS[plotKey];
  if (!script) return null;

  return (
    <Button
      key={plotKey}
      onClick={() => onSelected(script)}
      className="cea-tool-choices-button"
    >
      {PLOT_LABELS[plotKey] || plotKey}
    </Button>
  );
};

export const PlotChoices = ({ onSelected }) => {
  return (
    <div className="cea-tool-choices">
      <h2>Select a Plot Tool</h2>
      <div className="cea-tool-choices-group-list">
        {PLOT_GROUPS.map((group) => (
          <div key={group.label}>
            <Divider orientation="left" orientationMargin={0}>
              <span className="cea-tool-choices-group-label">
                {group.icon && <group.icon />}
                <small>{group.label}</small>
              </span>
            </Divider>
            <div className="cea-tool-choices-group-content">
              {group.subgroups ? (
                group.subgroups.map((sub) => (
                  <div key={sub.label} className="cea-tool-choices-subgroup">
                    <small className="cea-tool-choices-subgroup-label">
                      {sub.label}
                    </small>
                    <div className="cea-tool-choices-button-list">
                      {sub.keys.map((key) => (
                        <PlotButton
                          key={key}
                          plotKey={key}
                          onSelected={onSelected}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="cea-tool-choices-button-list">
                  {group.keys.map((key) => (
                    <PlotButton
                      key={key}
                      plotKey={key}
                      onSelected={onSelected}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PlotTool = ({
  script,
  onToolSelected,
  onPlotToolSelected,
  onRunOverride,
  // Passed straight through to Tool so callers can grey out specific
  // form fields without PlotTool needing to know their names. Canvas Builder
  // uses this to lock `what-if-name` since that field is driven from
  // the canvas bottom card, not the plot form.
  extraReadonlyFields,
}) => {
  const [form] = Form.useForm();
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const selectedMapLayer = useSelectedMapLayer();
  const plotToolPrefill = useToolCardStore((state) => state.plotToolPrefill);
  const clearPlotToolPrefill = useToolCardStore(
    (state) => state.clearPlotToolPrefill,
  );

  // FIXME: Hardcoded for now.
  const period = mapLayerParameters?.period;
  const timeline = mapLayerParameters?.timeline;
  const panelTech = mapLayerParameters?.['technology'];
  const panelType = mapLayerParameters?.['panel-type'];
  // Map-layer `data-column` — meaning depends on which map layer is
  // active. For lifecycle-emissions it's the emission categories; for
  // energy-by-carrier it's the carriers; for operational-emissions it's
  // either operation services or carriers (see `mapOpCategory` below).
  const mapDataColumn = mapLayerParameters?.['data-column'];
  // Operational-emissions map layer has a dedicated `category` param
  // (operation vs energy_carrier) that we mirror to the plot form.
  const mapOpCategory = mapLayerParameters?.category;
  // Map-layer `whatif_name` (single string) seeds the plot's
  // `what-if-name` field (MultiChoiceParameter) so the plot opens with
  // the same scenario already selected.
  const mapWhatifName = mapLayerParameters?.whatif_name;
  // Map-layer `surface` (multi-choice) on the Renewable Energy Potentials
  // layer seeds plot-solar's `y-metric-to-plot` field.
  const mapSurface = mapLayerParameters?.surface;
  // Optional seed values handed in via `selectPlotTool(tool, seed)`.
  // Used by the success-notification "View Results" flow to forward the
  // upstream job's submitted parameters (e.g. the list of what-if names
  // the user just costed) into the plot form. Takes priority over the
  // map-derived seeds and the "select all" fallback. The seed is
  // overwritten by the next `selectPlotTool` call (no eager clearing
  // here — that would race with `setContext`).
  const plotToolSeed = useSelectedPlotToolSeed();

  const contextValue = Form.useWatch('context', form);
  const setContext = useCallback(
    (params) => {
      // `params` is supplied when invoked via `onParametersLoaded` (the
      // Tool component passes its loaded parameter metadata so we can walk
      // the parameter list — e.g. to read a field's available choices for
      // a "select all" default). The two `useEffect`s below also call
      // `setContext()` with no argument; in those branches we just skip
      // the parameter-aware seeding paths.
      const solar_panel_types = {};

      let feature;
      // Get feature from script name after 'plot-'
      feature = script?.split('plot-')?.[1];

      // Special case for solar plots
      if (script == 'plot-solar') {
        if (panelTech === 'PV') {
          feature = 'pv';
          solar_panel_types.pv = panelType;
        } else if (panelTech === 'SC') {
          feature = 'sc';
          solar_panel_types.sc = panelType;
        } else if (panelTech === 'PVT') {
          // PVT encodes the PV + SC pair as a compound "<PV> + <SC>"
          // dropdown value (see SolarPotentialsLayer._PVT_PANEL_TYPE_SEP).
          // Split it so the plot form receives the two halves separately.
          feature = 'pvt';
          if (
            typeof panelType === 'string' &&
            panelType.includes(PVT_PANEL_TYPE_SEP)
          ) {
            const [pvCode, scCode] = panelType
              .split(PVT_PANEL_TYPE_SEP)
              .map((s) => s.trim());
            if (pvCode) solar_panel_types.pv = pvCode;
            if (scCode) solar_panel_types.sc = scCode;
          }
        }
      }

      let period_start = ((period?.[0] ?? 1) - 1) * 24;
      let period_end = (period?.[1] ?? 365) * 24;
      if (
        [
          'plot-lifecycle-emissions',
          'plot-emission-timeline',
          'plot-pathway-emission-timeline',
        ].includes(script)
      ) {
        period_start = timeline?.[0] ?? 0;
        period_end = timeline?.[1] ?? 0;
      }

      const nextValues = {
        context: { feature, period_start, period_end, solar_panel_types },
      };

      // Seed plot-lifecycle-emissions' y-category-to-plot from the map layer
      // selection. Only meaningful when the active map layer is lifecycle
      // emissions (because that's what `data-column` holds categories for).
      if (
        script === 'plot-lifecycle-emissions' &&
        selectedMapLayer === EMISSIONS_EMBODIED &&
        mapDataColumn != null
      ) {
        const asArray = Array.isArray(mapDataColumn)
          ? mapDataColumn
          : [mapDataColumn];
        if (asArray.length > 0) {
          nextValues['y-category-to-plot'] = asArray;
        }
      }

      // Seed plot-final-energy's `y-metric-to-plot` from the Energy by
      // Carrier map layer. Both sides use display names, so just pass
      // through after filtering to plot-supported carriers (`solar` is
      // not in the plot's choices).
      if (
        script === 'plot-final-energy' &&
        selectedMapLayer === FINAL_ENERGY &&
        mapDataColumn != null
      ) {
        const asArray = Array.isArray(mapDataColumn)
          ? mapDataColumn
          : [mapDataColumn];
        const valid = asArray.filter((c) => PLOT_FINAL_ENERGY_CARRIERS.has(c));
        if (valid.length > 0) {
          nextValues['y-metric-to-plot'] = valid;
        }
      }

      // Seed plot-demand's `y-metric-to-plot` from the Demand map layer.
      // Both sides now use the same display names
      // (electricity / space_heating / space_cooling / domestic_hot_water).
      if (
        script === 'plot-demand' &&
        selectedMapLayer === DEMAND &&
        mapDataColumn != null
      ) {
        const asArray = Array.isArray(mapDataColumn)
          ? mapDataColumn
          : [mapDataColumn];
        const valid = asArray.filter((s) => PLOT_DEMAND_SERVICES.has(s));
        if (valid.length > 0) {
          nextValues['y-metric-to-plot'] = valid;
        }
      }

      // Seed plot-solar's `y-metric-to-plot` from the Renewable Energy
      // Potentials map layer's `surface` multi-choice. Both sides use the
      // same surface names so we pass through, filtering only for values
      // the plot form recognises.
      if (
        script === 'plot-solar' &&
        selectedMapLayer === RENEWABLE_ENERGY_POTENTIALS &&
        mapSurface != null
      ) {
        const asArray = Array.isArray(mapSurface) ? mapSurface : [mapSurface];
        const valid = asArray.filter((s) => PLOT_SOLAR_SURFACES.has(s));
        if (valid.length > 0) {
          nextValues['y-metric-to-plot'] = valid;
        }
      }

      // Seed plot-operational-emissions from the Operational Emissions map
      // layer. `category` drives which underlying multi-choice field the
      // values flow into (`operation-services` vs `energy-carriers`).
      if (
        script === 'plot-operational-emissions' &&
        selectedMapLayer === EMISSIONS_OPERATIONAL &&
        mapDataColumn != null
      ) {
        const asArray = Array.isArray(mapDataColumn)
          ? mapDataColumn
          : [mapDataColumn];
        if (asArray.length > 0) {
          if (mapOpCategory === 'energy_carrier') {
            nextValues['y-category-to-plot'] = 'energy_carrier';
            nextValues['energy-carriers'] = asArray;
          } else {
            nextValues['y-category-to-plot'] = 'operation';
            nextValues['operation-services'] = asArray;
          }
        }
      }

      // Seed `what-if-name` (MultiChoiceParameter on the plot side).
      //
      // Priority order:
      //  1. Explicit `plotToolSeed['what-if-name']` — caller of
      //     `selectPlotTool(tool, seed)` (e.g. the "View Results" success
      //     notification) hands in the upstream job's submitted what-if
      //     names so the plot opens with exactly the run's scope selected.
      //  2. Map-layer `whatif_name` (single string) — keeps the plot
      //     focused on whichever scenario the user was viewing on the map.
      //  3. Fallback "select all" — when no upstream context exists, walk
      //     the loaded parameter metadata and pre-select every available
      //     what-if so the user sees their full history immediately.
      //
      // antd silently ignores the field for plots that don't define it.
      const seedWhatifNames = plotToolSeed?.['what-if-name'];
      if (Array.isArray(seedWhatifNames) && seedWhatifNames.length > 0) {
        nextValues['what-if-name'] = [...seedWhatifNames];
      } else if (mapWhatifName != null && mapWhatifName !== '') {
        nextValues['what-if-name'] = Array.isArray(mapWhatifName)
          ? mapWhatifName
          : [mapWhatifName];
      } else if (params) {
        // Walk the parameter metadata for a `what-if-name` field; grab its
        // available choices and pre-select all of them. The field name is
        // the same across plots that surface it.
        const allParams = [
          ...(params.parameters || []),
          ...Object.values(params.categorical_parameters || {}).flat(),
        ];
        const whatIfParam = allParams.find((p) => p?.name === 'what-if-name');
        if (whatIfParam && Array.isArray(whatIfParam.choices)) {
          nextValues['what-if-name'] = [...whatIfParam.choices];
        }
      }

      form.setFieldsValue(nextValues);
    },
    [
      form,
      period,
      panelTech,
      panelType,
      timeline,
      script,
      selectedMapLayer,
      mapDataColumn,
      mapOpCategory,
      mapWhatifName,
      mapSurface,
      plotToolSeed,
    ],
  );

  // One-shot prefill from the caller that opened this plot tool (e.g.
  // "View Results" on a just-completed pathway-simulations job seeds the
  // pathway name). Must be applied AFTER `useFormReset` has reset the
  // form to backend defaults, which is why we piggyback on the same
  // `onParametersLoaded` callback that re-runs `setContext`. A ref guards
  // against repeat application when unrelated deps change setContext.
  const appliedPrefillRef = useRef(null);
  useEffect(() => {
    // Reset the applied marker whenever the plot script changes so a new
    // tool session can consume a new prefill.
    appliedPrefillRef.current = null;
  }, [script]);

  const handleParametersLoaded = useCallback(
    (_params, { recheck } = {}) => {
      setContext();
      if (plotToolPrefill && appliedPrefillRef.current !== plotToolPrefill) {
        form.setFieldsValue(plotToolPrefill);
        appliedPrefillRef.current = plotToolPrefill;
        clearPlotToolPrefill();
        // Re-run the tool validation cycle so the stale error from the
        // pre-seeding pass is cleared and the prefilled values are
        // re-validated against the now-loaded choices.
        recheck?.();
      }
    },
    [setContext, plotToolPrefill, clearPlotToolPrefill, form],
  );

  // Ensure context is not empty
  useEffect(() => {
    if (Object.keys(contextValue ?? {}).length === 0) setContext();
  }, [contextValue, setContext]);

  useEffect(() => {
    setContext();
  }, [setContext]);

  // Note: no eager "clear seed" effect here. The seed lives in the
  // tool-card store and is overwritten on the next `selectPlotTool` call
  // (with a fresh seed, or `null` when the user opens a plot manually
  // from the picker). Clearing here on first mount would race with
  // `setContext` and wipe the seed before the form sees it — which used
  // to make the plot fall back to a stale alphabetical default and is
  // exactly the bug we're avoiding.

  if (script == null) return <PlotChoices onSelected={onPlotToolSelected} />;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: CEA_PURPLE,
        },
      }}
    >
      <Tool
        key={script}
        script={script}
        onToolSelected={onToolSelected}
        form={form}
        // Re-seed map-layer-backed form fields AND apply any one-shot
        // prefill AFTER the Tool has loaded its parameters and reset the
        // form to the backend defaults, otherwise these values get wiped
        // by `useFormReset`.
        onParametersLoaded={handleParametersLoaded}
        // Forwarded to ToolFormButtons so Canvas Builder can intercept Run
        // (commit plot config to a card) without creating a job.
        onRunOverride={onRunOverride}
        extraReadonlyFields={extraReadonlyFields}
      />
    </ConfigProvider>
  );
};
