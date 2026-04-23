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
import { PLOTS_PRIMARY_COLOR } from 'constants/theme';

// Plot script → map layer (the specific layer whose parameters the
// plot reads). Reverses `VIEW_PLOT_RESULTS`.
const scriptToMapLayer = (script) => {
  if (!script) return null;
  for (const [layerName, plotScript] of Object.entries(VIEW_PLOT_RESULTS)) {
    if (plotScript === script) return layerName;
  }
  return null;
};

// Layer → parent category, looked up in the backend's categories
// response. Handles the LCA case where multiple layers (energy-by-
// carrier, operational-emissions, lifecycle-emissions, heat-rejection,
// …) all live under the `life-cycle-analysis` category.
const findCategoryForLayer = (layerName, categories) => {
  if (!layerName || !categories) return null;
  for (const cat of categories) {
    if (cat.layers?.some((l) => l.name === layerName)) return cat.name;
  }
  return null;
};

/**
 * Plot configuration card — shares the main viewport's tool card
 * chrome AND its form layout. Uses `<PlotTool>` so the plot form's
 * `context`, `what-if-name`, `y-metric-to-plot` etc. are seeded from
 * `useMapStore` — which the bottom card's `MapLayerPropertiesCard`
 * writes to. Reports-specific: `onRunOverride` intercepts the Run
 * click and commits the plot config to the report slot instead of
 * creating a job.
 *
 * Two phases inside the same card:
 *   1. Plot picker — `PlotChoices` imported from the main viewport.
 *   2. Parameter form — rendered by `<PlotTool>` with a Back button
 *      in the card header to return to the picker.
 *
 * Note: edit mode doesn't restore saved `plotConfig.parameters` since
 * `PlotTool` owns its own form internally; users re-tune on edit for
 * now. If that becomes painful we can add a prefill path via the
 * shared `useToolCardStore.plotToolPrefill`.
 */
const PlotEditModal = ({
  open,
  scenario: _scenario,
  plotConfig,
  mode = 'edit',
  onSave,
  onCancel,
}) => {
  const [selectedScript, setSelectedScript] = useState(
    plotConfig?.script || null,
  );

  useEffect(() => {
    if (open) {
      setSelectedScript(plotConfig?.script || null);
      return undefined;
    }
    // Hold the current script for the duration of the slide-out
    // animation, then clear it so PlotTool's internal queries stop.
    const t = setTimeout(() => setSelectedScript(null), 350);
    return () => clearTimeout(t);
  }, [open, plotConfig]);

  // Keep the shared map-layer category + selected layer in sync with
  // the plot being edited. The CATEGORY is derived from the backend's
  // categories list (looking up which category contains the plot's
  // layer), and the LAYER is the plot's specific map constant. For
  // LCA plots this means category = 'life-cycle-analysis' and layer
  // = (e.g.) 'energy-by-carrier'. Cleared on drawer close so the
  // bottom card empties out.
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
  // validated form values. Commit the plot config to the report slot.
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
        // itself collapses to 0 in ReportsPage.
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      {/* Header — matches ToolCard.jsx: optional Back, close icon right. */}
      <div className="cea-tool-card-header" style={headerStyle}>
        {selectedScript && <Button onClick={handleBack}>Back</Button>}
        <Button
          icon={<VerticalLeftOutlined />}
          onClick={onCancel}
          style={{ marginLeft: 'auto', padding: 12 }}
          aria-label="Close"
        />
      </div>

      <div className="cea-tool-card-content" style={contentStyle}>
        {selectedScript ? (
          // Use the main viewport's PlotTool so the form's `context`
          // field is populated from `useMapStore` — which the bottom
          // card's MapLayerPropertiesCard writes to. ConfigProvider
          // keeps the primary colour on the plots purple.
          <ConfigProvider
            theme={{ token: { colorPrimary: PLOTS_PRIMARY_COLOR } }}
          >
            <PlotTool
              key={selectedScript}
              script={selectedScript}
              onRunOverride={handleRunOverride}
            />
          </ConfigProvider>
        ) : (
          <PlotChoices onSelected={setSelectedScript} />
        )}
      </div>
    </div>
  );
};

// The plot tool now lives in its own grid cell (see ReportsPage.jsx),
// so it fills the cell rather than being `position: fixed`. The grid
// column animates open/close in ReportsPage; we only handle the card
// chrome (shadow, radius, padding) here, copied from ToolCard.jsx.
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
