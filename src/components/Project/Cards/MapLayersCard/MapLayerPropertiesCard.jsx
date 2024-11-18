import ParameterSelectors from '../../../Map/Layers/Selectors/base';
import Legend from '../../../Map/Layers/Legend';
import { useMapStore } from '../../../Map/store/store';
import { useGetMapLayers } from '../../../Map/Layers';
import { useEffect } from 'react';
import { Alert } from 'antd';

const MapLayerPropertiesCard = () => {
  const categoryInfo = useMapStore((state) => state.selectedMapCategory);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );
  const setMapLayers = useMapStore((state) => state.setMapLayers);

  // Reset layers and parameters when category changes
  useEffect(() => {
    setMapLayers(null);
    setMapLayerParameters(null);

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

  const { fetching, error } = useGetMapLayers(categoryInfo, mapLayerParameters);

  if (!categoryInfo || !categoryInfo?.layers) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <Alert message={error} type="error" showIcon />}
      <div
        style={{
          display: 'flex',
          gap: 12,
          position: 'relative',
        }}
      >
        {fetching && (
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
        )}
        <Legend />
        <ParameterSelectors
          layers={categoryInfo.layers}
          parameterValues={mapLayerParameters}
        />
      </div>
    </div>
  );
};

export default MapLayerPropertiesCard;
