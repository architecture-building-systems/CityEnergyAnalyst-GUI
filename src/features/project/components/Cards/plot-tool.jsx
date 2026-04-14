import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider, Divider, Form } from 'antd';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { useCallback, useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import {
  VIEW_PLOT_RESULTS,
  PLOT_LABELS,
  PLOT_GROUPS,
} from 'features/plots/constants';
import './tool-choices.css';

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

  // FIXME: Hardcoded for now.
  const period = mapLayerParameters?.period;
  const timeline = mapLayerParameters?.timeline;
  const panelTech = mapLayerParameters?.['technology'];
  const panelType = mapLayerParameters?.['panel-type'];
  // Map-layer `data-column` for lifecycle emissions is the same set of
  // categories as the plot's `y-category-to-plot` — seed the plot form
  // with whatever is currently selected on the map.
  const lifecycleDataColumn = mapLayerParameters?.['data-column'];
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
    // selection. The map layer's `data-column` parameter may be a string
    // (single-choice legacy) or an array (multi-select). Normalise to an
    // array since the plot's y-category-to-plot is a MultiChoiceParameter.
    if (script === 'plot-lifecycle-emissions' && lifecycleDataColumn != null) {
      const asArray = Array.isArray(lifecycleDataColumn)
        ? lifecycleDataColumn
        : [lifecycleDataColumn];
      if (asArray.length > 0) {
        nextValues['y-category-to-plot'] = asArray;
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
    lifecycleDataColumn,
    mapWhatifName,
  ]);

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
      />
    </ConfigProvider>
  );
};
