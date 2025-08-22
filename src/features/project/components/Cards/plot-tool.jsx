import Tool from 'features/tools/components/Tools/Tool';
import { ConfigProvider, Form } from 'antd';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import { VIEW_PLOT_RESULTS } from 'features/status-bar/components/StatusBar';

const PlotChoices = () => {
  const choices = Object.keys(VIEW_PLOT_RESULTS).filter(
    (key) => VIEW_PLOT_RESULTS[key],
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {choices.map((choice) => (
        <div key={choice}>{choice}</div>
      ))}
    </div>
  );
};

export const PlotTool = ({ script, onToolSelected }) => {
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
    if (script == 'plot-demand') {
      feature = 'demand';
    } else if (script == 'plot-solar') {
      if (panelTech === 'PV') {
        feature = 'pv';
      } else if (panelTech === 'SC') {
        feature = 'sc';
      }
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

  if (script == null) return <PlotChoices />;

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
