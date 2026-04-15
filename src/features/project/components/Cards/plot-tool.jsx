import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider, Divider, Form } from 'antd';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { useCallback, useEffect, useRef } from 'react';
import { useMapStore, useSelectedMapLayer } from 'features/map/stores/mapStore';
import {
  DEMAND,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
  FINAL_ENERGY,
} from 'features/map/constants';
import {
  VIEW_PLOT_RESULTS,
  PLOT_LABELS,
  PLOT_GROUPS,
} from 'features/plots/constants';
import { useToolCardStore } from 'features/project/stores/tool-card';
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

const PlotChoices = ({ onSelected }) => {
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

export const PlotTool = ({ script, onToolSelected, onPlotToolSelected }) => {
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

  const contextValue = Form.useWatch('context', form);
  const setContext = useCallback(() => {
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

    // Seed `what-if-name` (MultiChoiceParameter on the plot side) from the
    // map layer's current `whatif_name` (single string). Applied for any
    // plot — antd form silently holds the value if the plot has no such
    // field, and picks it up automatically for plots that do.
    if (mapWhatifName != null && mapWhatifName !== '') {
      nextValues['what-if-name'] = Array.isArray(mapWhatifName)
        ? mapWhatifName
        : [mapWhatifName];
    }

    form.setFieldsValue(nextValues);
  }, [
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
  ]);

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

  if (script == null) return <PlotChoices onSelected={onPlotToolSelected} />;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: PLOTS_PRIMARY_COLOR,
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
      />
    </ConfigProvider>
  );
};
