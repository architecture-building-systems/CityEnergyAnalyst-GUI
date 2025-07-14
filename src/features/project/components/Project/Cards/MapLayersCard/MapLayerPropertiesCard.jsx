import ParameterSelectors from 'features/map/components/Map/Layers/Selectors/base';
import Legend from 'features/map/components/Map/Layers/Legend';
import { useMapStore } from 'features/map/stores/mapStore';
import { useGetMapLayers } from 'features/map/components/Map/Layers/hooks';
import { useEffect } from 'react';
import { Alert } from 'antd';
import { useProjectStore } from 'features/project/stores/projectStore';

const MapLayerPropertiesCard = () => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);

  const categoryInfo = useMapStore((state) => state.selectedMapCategory);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );
  const setMapLayers = useMapStore((state) => state.setMapLayers);

  // Reset layers when project or scenario name changes
  // Reset layers when category changes
  useEffect(() => {
    setMapLayers(null);
    setMapLayerParameters(null);
  }, [project, scenarioName, categoryInfo]);

  // Reset layers and parameters when category changes
  useEffect(() => {
    if (!categoryInfo?.layers) return;

    // Initialize parameters object with defaults from all layers
    const parameters = {};
    for (const layer of categoryInfo.layers) {
      const { parameters: layerParameters } = layer;
      for (const [key, value] of Object.entries(layerParameters)) {
        if (value?.default) {
          parameters[key] = value.default;
        }
      }
    }

    setMapLayerParameters(parameters);
  }, [categoryInfo]);

  const { fetching, error } = useGetMapLayers(
    categoryInfo,
    project,
    scenarioName,
    mapLayerParameters,
  );

  if (!categoryInfo || !categoryInfo?.layers) return null;

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
        <ParameterSelectors
          layers={categoryInfo.layers}
          parameterValues={mapLayerParameters}
        />
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
