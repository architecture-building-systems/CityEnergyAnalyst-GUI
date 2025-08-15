import { VerticalLeftOutlined } from '@ant-design/icons';
import Tool from 'features/tools/components/Tools/Tool';
import { Button, ConfigProvider, Form } from 'antd';

import {
  useCloseToolCard,
  toolTypes,
  useToolType,
} from 'features/project/stores/tool-card';
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';
import { BuildingEditor } from 'features/building-editor/components/building-editor';
import ErrorBoundary from 'antd/es/alert/ErrorBoundary';
import { useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';

const ToolCard = ({ selectedTool, selectedPlotTool, onToolSelected }) => {
  const toolType = useToolType();
  const closeToolCard = useCloseToolCard();

  // TODO: Move to CSS
  return (
    <ErrorBoundary>
      <div
        style={{
          background: '#fff',

          borderRadius: 12,
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',

          height: '100%',
          boxSizing: 'border-box',
          padding: 12,

          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,

            flexShrink: 0,
          }}
        >
          <Button
            icon={<VerticalLeftOutlined />}
            onClick={closeToolCard}
            style={{ marginLeft: 'auto', padding: 12 }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {toolType == toolTypes.TOOLS &&
            (selectedTool != null ? (
              <Tool script={selectedTool} onToolSelected={onToolSelected} />
            ) : (
              <div>No tool selected</div>
            ))}

          {toolType == toolTypes.MAP_LAYERS && (
            <PlotTool
              script={selectedPlotTool}
              onToolSelected={onToolSelected}
            />
          )}
          {toolType == toolTypes.BUILDING_INFO && <BuildingEditor />}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const PlotTool = ({ script, onToolSelected }) => {
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

    if (panelTech === 'SC') {
      solar_panel_types.sc = panelType;
    } else if (panelTech === 'PV') {
      solar_panel_types.pv = panelType;
    }
    form.setFieldsValue({
      context: { hour_start, hour_end, solar_panel_types },
    });
  }, [form, period, panelType, panelTech]);

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

export default ToolCard;
