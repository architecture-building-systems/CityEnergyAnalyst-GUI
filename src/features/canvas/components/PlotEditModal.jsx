import { useState, useEffect, useCallback } from 'react';
import { ConfigProvider, Button } from 'antd';
import { VerticalLeftOutlined } from '@ant-design/icons';

import {
  PlotChoices,
  PlotTool,
} from 'features/project/components/Cards/plot-tool';
import {
  useMapLayerCategories,
  useSetActiveMapCategory,
} from 'features/project/components/Cards/MapLayersCard/store';
import { useMapStore } from 'features/map/stores/mapStore';
import { VIEW_PLOT_RESULTS } from 'features/plots/constants';
import { CEA_PURPLE } from 'constants/theme';
import { ToolScenarioOverrideContext } from 'features/tools/hooks/useToolParams';

// Reverse `VIEW_PLOT_RESULTS` to find the map layer a plot script
// reads its parameters from.
const scriptToMapLayer = (script) => {
  if (!script) return null;
  for (const [layerName, plotScript] of Object.entries(VIEW_PLOT_RESULTS)) {
    if (plotScript === script) return layerName;
  }
  return null;
};

// Locate the category that owns a given layer (e.g. all LCA layers
// — energy-by-carrier, operational-emissions, lifecycle-emissions,
// heat-rejection — live under `life-cycle-analysis`).
const findCategoryForLayer = (layerName, categories) => {
  if (!layerName || !categories) return null;
  for (const cat of categories) {
    if (cat.layers?.some((l) => l.name === layerName)) return cat.name;
  }
  return null;
};

/**
 * Plot configuration card — same chrome + form layout as the main
 * viewport's tool card via `<PlotTool>`. The plot form's `context`,
 * `what-if-name`, `y-metric-to-plot` are seeded from `useMapStore`,
 * which `MapLayerPropertiesCard` (in the bottom card) writes to.
 *
 * `onRunOverride` intercepts Run and commits the resulting params
 * to the report slot instead of creating a job.
 *
 * Two phases inside the same card:
 *   1. `PlotChoices` picker (imported from the main viewport).
 *   2. `<PlotTool>` parameter form, with a Back button in the header.
 *
 * Edit mode doesn't currently rehydrate saved `plotConfig.parameters`
 * — PlotTool owns its own form, and users re-tune on edit.
 */
const PlotEditModal = ({
  open,
  plotConfig,
  onSave,
  onCancel,
  allowBack = true,
  // Optional `{ project, scenarioName }` to scope the form's
  // parameter-schema fetch to a specific (project, scenario) —
  // overrides the project store. Used by Compare-mode
  // per-column edit so each column's form loads its own
  // scenario's choice generators (what-if names, building
  // lists, etc.). `null` falls through to project-store values.
  scenarioOverride = null,
}) => {
  const [selectedScript, setSelectedScript] = useState(
    plotConfig?.script || null,
  );

  // Hold the current script for the duration of the slide-out
  // animation, then clear so PlotTool's internal queries stop.
  useEffect(() => {
    if (open) {
      setSelectedScript(plotConfig?.script || null);
      return undefined;
    }
    const t = setTimeout(() => setSelectedScript(null), 350);
    return () => clearTimeout(t);
  }, [open, plotConfig]);

  // Sync the shared map-layer selection to the plot being edited so
  // MapLayerPropertiesCard (bottom card) renders that layer's form.
  // Cleared on drawer close.
  const setActiveCategory = useSetActiveMapCategory();
  const setSelectedMapLayer = useMapStore((s) => s.setSelectedMapLayer);
  const mapLayerCategories = useMapLayerCategories();
  useEffect(() => {
    if (!open) {
      setActiveCategory(null);
      setSelectedMapLayer(null);
      return;
    }
    const layer = scriptToMapLayer(selectedScript);
    const category = findCategoryForLayer(
      layer,
      mapLayerCategories?.categories,
    );
    setActiveCategory(category);
    setSelectedMapLayer(layer);
  }, [
    open,
    selectedScript,
    mapLayerCategories,
    setActiveCategory,
    setSelectedMapLayer,
  ]);

  const handleBack = useCallback(() => {
    setSelectedScript(null);
  }, []);

  // PlotTool → Tool → ToolFormButtons.onRunOverride — called with
  // validated form values. Commit them to the report slot.
  const handleRunOverride = useCallback(
    async (params) => {
      onSave({ script: selectedScript, parameters: params });
    },
    [onSave, selectedScript],
  );

  return (
    <div
      className="cea-tool-card"
      style={{
        ...cardStyle,
        // Fade + ignore pointer events when closed; the grid column
        // itself collapses to 0 in CanvasPage.
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="cea-tool-card-header" style={headerStyle}>
        {selectedScript && allowBack && (
          <Button onClick={handleBack}>Back</Button>
        )}
        <Button
          icon={<VerticalLeftOutlined />}
          onClick={onCancel}
          style={{ marginLeft: 'auto', padding: 12 }}
          aria-label="Close"
        />
      </div>

      <div className="cea-tool-card-content" style={contentStyle}>
        {selectedScript ? (
          <ToolScenarioOverrideContext.Provider value={scenarioOverride}>
            <ConfigProvider
              theme={{ token: { colorPrimary: CEA_PURPLE } }}
            >
              <PlotTool
                key={selectedScript}
                script={selectedScript}
                onRunOverride={handleRunOverride}
              />
            </ConfigProvider>
          </ToolScenarioOverrideContext.Provider>
        ) : (
          <PlotChoices onSelected={setSelectedScript} />
        )}
      </div>
    </div>
  );
};

// Card chrome only — the open/close slide is handled by the parent
// grid cell in CanvasPage. Shadow/radius/padding mirror ToolCard.jsx.
const cardStyle = {
  width: '100%',
  height: '100%',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  boxSizing: 'border-box',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  transition: 'opacity 0.25s ease-in-out',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
};

const contentStyle = {
  minHeight: 0,
  flex: 1,
  overflowY: 'auto',
};

export default PlotEditModal;
