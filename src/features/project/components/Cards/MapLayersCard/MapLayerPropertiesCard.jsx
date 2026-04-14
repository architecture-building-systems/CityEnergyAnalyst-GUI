import ParameterSelectors from 'features/map/components/Map/Layers/Selectors/base';
import Legend from 'features/map/components/Map/Layers/Legend';
import { useMapStore } from 'features/map/stores/mapStore';
import { useGetMapLayers } from 'features/map/hooks/map-layers';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert, InputNumber, Select } from 'antd';
import { useProjectStore } from 'features/project/stores/projectStore';
import { useSelectedMapCategoryInfo } from './store';

const LEGEND_FILTER_KEYS = ['scale', 'radius'];

const LegendFilterField = ({ label, filterKey, range, defaultValue }) => {
  const value = useMapStore((state) => state.filters?.[filterKey]);
  const setFilters = useMapStore((state) => state.setFilters);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <b>{label}</b>
      <InputNumber
        min={range?.[0]}
        max={range?.[1]}
        value={value ?? defaultValue}
        onChange={(v) => setFilters(filterKey, v)}
        style={{ flex: 1, minWidth: 0 }}
      />
    </div>
  );
};

const LegendFilterRow = ({ layers }) => {
  const fields = useMemo(() => {
    if (!layers?.length) return [];
    const layer = layers[0];
    if (!layer?.parameters) return [];

    const collected = [];
    for (const key of LEGEND_FILTER_KEYS) {
      for (const [, parameter] of Object.entries(layer.parameters)) {
        if (parameter?.filter === key) {
          collected.push({
            key,
            label: parameter.label ?? key,
            range: parameter.range,
            defaultValue: parameter.default,
          });
          break;
        }
      }
    }
    return collected;
  }, [layers]);

  if (!fields.length) return null;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {fields.map((f) => (
        <LegendFilterField
          key={f.key}
          label={f.label}
          filterKey={f.key}
          range={f.range}
          defaultValue={f.defaultValue}
        />
      ))}
    </div>
  );
};

const LayerSelector = ({ layers, onLayerSelect }) => {
  const selectedLayer = useMapStore((state) => state.selectedMapLayer);
  const setSelectedLayer = useMapStore((state) => state.setSelectedMapLayer);

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
        <Legend extras={<LegendFilterRow layers={filteredLayers} />} />

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
  return <Alert title={error} type="error" showIcon />;
};

export default MapLayerPropertiesCard;
