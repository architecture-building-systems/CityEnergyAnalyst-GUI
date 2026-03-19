import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider, Divider, Form } from 'antd';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { useCallback, useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import { iconMap, VIEW_PLOT_RESULTS, PLOT_LABELS, PLOT_GROUPS } from 'features/plots/constants';

const PlotButton = ({ plotKey, onSelected }) => {
  const script = VIEW_PLOT_RESULTS[plotKey];
  if (!script) return null;
  const Icon = iconMap?.[plotKey] || null;
  return (
    <Button
      key={plotKey}
      icon={Icon ? <Icon /> : null}
      onClick={() => onSelected(script)}
      style={{ justifyContent: 'flex-start', width: '100%' }}
    >
      {PLOT_LABELS[plotKey] || plotKey}
    </Button>
  );
};

const PlotChoices = ({ onSelected }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h2 style={{ marginBottom: 8 }}>Select a Plot Tool</h2>
      {PLOT_GROUPS.map((group) => (
        <div key={group.label}>
          <Divider orientation="left" orientationMargin={0} style={{ marginBlock: 8 }}>
            <small style={{ fontWeight: 600, color: '#555' }}>{group.label}</small>
          </Divider>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12 }}>
            {group.subgroups ? (
              group.subgroups.map((sub) => (
                <div key={sub.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <small style={{ color: '#888', marginLeft: -12 }}>{sub.label}</small>
                  {sub.keys.map((key) => (
                    <PlotButton key={key} plotKey={key} onSelected={onSelected} />
                  ))}
                </div>
              ))
            ) : (
              group.keys.map((key) => (
                <PlotButton key={key} plotKey={key} onSelected={onSelected} />
              ))
            )}
          </div>
        </div>
      ))}
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
      ['plot-lifecycle-emissions', 'plot-emission-timeline'].includes(script)
    ) {
      period_start = timeline?.[0] ?? 0;
      period_end = timeline?.[1] ?? 0;
    }

    form.setFieldsValue({
      context: { feature, period_start, period_end, solar_panel_types },
    });
  }, [form, period, panelTech, panelType, timeline, script]);

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
