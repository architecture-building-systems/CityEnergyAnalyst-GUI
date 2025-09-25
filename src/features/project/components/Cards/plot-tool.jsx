import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider, Form } from 'antd';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import { iconMap, VIEW_PLOT_RESULTS } from 'features/plots/constants';

const PlotChoices = ({ onSelected }) => {
  const choices = Object.keys(VIEW_PLOT_RESULTS).filter(
    (key) => VIEW_PLOT_RESULTS[key],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Select a Plot Tool</h2>
      {choices.map((choice) => {
        const Icon = iconMap?.[choice] || null; // Fallback to null if no icon is found
        return (
          <Button
            key={choice}
            icon={<Icon />}
            onClick={() => onSelected(VIEW_PLOT_RESULTS[choice])}
          >
            {choice}
          </Button>
        );
      })}
    </div>
  );
};

export const PlotTool = ({ script, onToolSelected, onPlotToolSelected }) => {
  const [form] = Form.useForm();
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);

  // FIXME: Hardcoded for now.
  const period = mapLayerParameters?.period;
  const panelTech = mapLayerParameters?.['technology'];
  const panelType = mapLayerParameters?.['panel-type'];

  useEffect(() => {
    const hour_start = ((period?.[0] ?? 1) - 1) * 24;
    const hour_end = (period?.[1] ?? 365) * 24;
    const solar_panel_types = {};

    let feature;
    // Special case for solar plots
    if (script == 'plot-solar') {
      if (panelTech === 'PV') {
        feature = 'pv';
      } else if (panelTech === 'SC') {
        feature = 'sc';
      }
    } else {
      // Get feature from script name after 'plot-'
      feature = script?.split('plot-')?.[1];
    }

    if (panelTech === 'SC') {
      solar_panel_types.sc = panelType;
    } else if (panelTech === 'PV') {
      solar_panel_types.pv = panelType;
    }
    form.setFieldsValue({
      context: { feature, hour_start, hour_end, solar_panel_types },
    });
  }, [form, script, period, panelType, panelTech]);

  if (script == null) return <PlotChoices onSelected={onPlotToolSelected} />;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: PLOTS_PRIMARY_COLOR,
        },
      }}
    >
      <Tool script={script} onToolSelected={onToolSelected} form={form} />
    </ConfigProvider>
  );
};
