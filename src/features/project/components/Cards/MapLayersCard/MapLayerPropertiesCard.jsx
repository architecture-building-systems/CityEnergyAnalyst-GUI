import ParameterSelectors from 'features/map/components/Map/Layers/Selectors/base';
import Legend, {
  LegendFilterRow,
} from 'features/map/components/Map/Layers/Legend';
import { useGetMapLayers } from 'features/map/hooks/map-layers';
import {
  useScopedSelectedMapLayer,
  useScopedSetSelectedMapLayer,
  useScopedMapLayerParameters,
  useScopedProjectScenario,
  useScopedSetMapLayerParameters,
  useScopedSetMapLayers,
  useScopedSelectedCategoryInfo,
} from 'features/canvas/components/mapInstance';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Select } from 'antd';

const LayerSelector = ({ layers, onLayerSelect }) => {
  const selectedLayer = useScopedSelectedMapLayer();
  const setSelectedLayer = useScopedSetSelectedMapLayer();

  const handleLayerSelected = useCallback(
    (layerName) => {
      setSelectedLayer(layerName);
      onLayerSelect?.(layerName);
    },
    [setSelectedLayer, onLayerSelect],
  );

  // When layers change, check if the selected layer is still valid
  // If not, auto-select the first layer (without notifying parent)
  useEffect(() => {
    if (!layers?.length) {
      setSelectedLayer(null);
      return;
    }

    if (!selectedLayer || !layers.find((l) => l.name === selectedLayer)) {
      setSelectedLayer(layers[0].name);
    }
  }, [layers, selectedLayer, setSelectedLayer]);

  // Do not show selector if there is only one layer
  if (layers?.length <= 1) return null;

  return (
    <Select
      // Top padding is owned by the parent card wrapper so the
      // alignment with the Legend card holds whether or not this
      // LayerSelector is rendered. Only horizontal + bottom margins
      // here.
      style={{ margin: '0 12px 8px 12px' }}
      placeholder="Select a layer"
      value={selectedLayer}
      onChange={handleLayerSelected}
      options={layers.map((layer) => ({
        label: layer.label,
        value: layer.name,
      }))}
    />
  );
};

const useFilteredLayers = (layers) => {
  const selectedLayer = useScopedSelectedMapLayer();

  return useMemo(() => {
    if (!layers || !selectedLayer) return [];
    return layers.filter((layer) => layer.name === selectedLayer);
  }, [layers, selectedLayer]);
};

const MapLayerPropertiesCard = ({
  onLayerSelect,
  hideLegend = false,
  // When `true`, skip the intra-category `LayerSelector` dropdown —
  // the caller is expected to set `selectedMapLayer` some other way
  // (e.g. Canvas Builder drives it from the plot script being edited).
  hideLayerSelector = false,
  // Optional allowlist of parameter keys to render. Passed through to
  // ParameterSelectors; `null`/`undefined` = render everything (main
  // viewport default). Canvas Builder uses this to hide anything the plot
  // form already owns (period, data-column, etc.).
  allowParamKeys,
}) => {
  // Compare-mode FeatureCardMap / BottomCard publish a per-column
  // override via `MapLayerScenarioOverrideContext`; outside any
  // provider falls back to the project store (main viewport).
  const { project, scenarioName } = useScopedProjectScenario();

  const categoryInfo = useScopedSelectedCategoryInfo();
  const mapLayerParameters = useScopedMapLayerParameters();
  const setMapLayerParameters = useScopedSetMapLayerParameters();
  const setMapLayers = useScopedSetMapLayers();

  const layers = categoryInfo?.layers;
  const filteredLayers = useFilteredLayers(layers);

  // Reset layers when project or scenario name changes
  // Reset layers when category changes
  useEffect(() => {
    setMapLayers(null);
    setMapLayerParameters(null);
  }, [project, scenarioName, categoryInfo]);

  // Initialize parameters from active layer when it changes
  useEffect(() => {
    const activeLayer = filteredLayers[0];
    if (!activeLayer?.parameters) return;

    const parameters = {};
    for (const [key, value] of Object.entries(activeLayer.parameters)) {
      if (value && Object.prototype.hasOwnProperty.call(value, 'default')) {
        parameters[key] = value.default;
      }
    }

    setMapLayerParameters(parameters);
  }, [filteredLayers, setMapLayerParameters]);

  const { fetching, error } = useGetMapLayers(
    categoryInfo,
    project,
    scenarioName,
    mapLayerParameters,
  );

  if (!layers) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <Error error={error} />}
      <div
        style={{
          display: 'flex',
          gap: 12,
          position: 'relative',
        }}
      >
        {fetching && <Loading />}
        {!hideLegend && (
          <Legend extras={<LegendFilterRow layers={filteredLayers} />} />
        )}

        <div
          className="cea-overlay-card"
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,

            // Top padding matches the Legend card's `padding: 12` so the
            // first row of content in both cards sits at the same Y,
            // whether or not the LayerSelector is visible (single-layer
            // categories like `thermal-network` hide it).
            paddingTop: 12,

            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 12,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {!hideLayerSelector && (
            <LayerSelector layers={layers} onLayerSelect={onLayerSelect} />
          )}
          <ParameterSelectors
            layers={filteredLayers}
            parameterValues={mapLayerParameters}
            allowParamKeys={allowParamKeys}
          />
        </div>
      </div>
    </div>
  );
};

const Loading = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        pointerEvents: 'all',
        userSelect: 'none',
      }}
    >
      Fetching data...
    </div>
  );
};

const Error = ({ error }) => {
  return <Alert title={error} type="error" showIcon />;
};

export default MapLayerPropertiesCard;
