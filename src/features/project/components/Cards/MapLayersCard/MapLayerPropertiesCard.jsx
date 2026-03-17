import ParameterSelectors from 'features/map/components/Map/Layers/Selectors/base';
import Legend from 'features/map/components/Map/Layers/Legend';
import { useMapStore } from 'features/map/stores/mapStore';
import { useGetMapLayers } from 'features/map/hooks/map-layers';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Select } from 'antd';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useSelectedMapCategoryInfo } from './store';

const LayerSelector = ({ layers, onLayerSelect }) => {
  const selectedLayer = useMapStore((state) => state.selectedMapLayer);
  const setSelectedLayer = useMapStore((state) => state.setSelectedMapLayer);

  const handleLayerSelected = useCallback(
    (layerName) => {
      setSelectedLayer(layerName);
      if (onLayerSelect) onLayerSelect?.(layerName);
    },
    [setSelectedLayer, onLayerSelect],
  );

  // When layers change, check if the selected layer is still valid
  // If not, select the first layer
  useEffect(() => {
    if (!layers?.length) {
      setSelectedLayer(null);
      return;
    }

    if (!selectedLayer || !layers.find((l) => l.name === selectedLayer)) {
      handleLayerSelected(layers[0].name);
    }
  }, [layers, selectedLayer, setSelectedLayer, handleLayerSelected]);

  // Do not show selector if there is only one layer
  if (layers?.length <= 1) return null;

  return (
    <Select
      style={{ margin: 8 }}
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
  const selectedLayer = useMapStore((state) => state.selectedMapLayer);

  return useMemo(() => {
    if (!layers || !selectedLayer) return [];
    return layers.filter((layer) => layer.name === selectedLayer);
  }, [layers, selectedLayer]);
};

const MapLayerPropertiesCard = ({ onLayerSelect }) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);

  const categoryInfo = useSelectedMapCategoryInfo();
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );
  const setMapLayers = useMapStore((state) => state.setMapLayers);

  const layers = categoryInfo?.layers;
  const filteredLayers = useFilteredLayers(layers);

  // Reset layers when project or scenario name changes
  // Reset layers when category changes
  useEffect(() => {
    setMapLayers(null);
    setMapLayerParameters(null);
  }, [project, scenarioName, categoryInfo]);

  // Reset layers and parameters when category changes
  useEffect(() => {
    if (!layers) return;

    // Initialize parameters object with defaults from all layers
    const parameters = {};
    for (const layer of layers) {
      const { parameters: layerParameters } = layer;
      for (const [key, value] of Object.entries(layerParameters)) {
        if (value?.default) {
          parameters[key] = value.default;
        }
      }
    }

    setMapLayerParameters(parameters);
  }, [layers, setMapLayerParameters]);

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
        <Legend />

        <div
          className="cea-overlay-card"
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,

            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 12,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <LayerSelector layers={layers} onLayerSelect={onLayerSelect} />
          <ParameterSelectors
            layers={filteredLayers}
            parameterValues={mapLayerParameters}
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
  return <Alert message={error} type="error" showIcon />;
};

export default MapLayerPropertiesCard;
