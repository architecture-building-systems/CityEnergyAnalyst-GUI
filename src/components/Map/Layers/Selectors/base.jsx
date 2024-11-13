import { useEffect } from 'react';
import { useMapStore } from '../../store/store';
import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threhold';

const ParameterSelectors = () => {
  const layers = useMapStore((state) => state.selectedMapCategory?.layers);
  const mapLayers = useMapStore((state) => state.mapLayers);

  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  useEffect(() => {
    if (layers) {
      let parameters = {};
      for (const layer of layers) {
        const { parameters: layerParameters } = layer;

        // Apply default parameter values
        for (const [key, value] of Object.entries(layerParameters)) {
          if (value?.default) parameters[key] = value.default;
        }
      }
      setMapLayerParameters(parameters);
    } else {
      setMapLayerParameters(null);
    }
  }, [layers, setMapLayerParameters]);

  if (!layers || !mapLayers || Object.keys(mapLayers).length === 0) return null;

  return (
    <div
      className="cea-overlay-card"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        display: 'flex',
        flexDirection: 'column',

        padding: 2,
        width: '100%',

        fontSize: 12,

        gap: 2,
      }}
    >
      {/* {layers.map((layer) => {
        const { name, parameters } = layer;
        console.log(name, parameters);
        return (
          <TimeSeriesSelector
            key={name}
            parameterName={name}
            defaultValue={parameters?.hour ?? 3636}
          />
        );
      })} */}
      <TimeSeriesSelector parameterName={'hour'} defaultValue={3636} />
      <ThresholdSelector defaultValue={[0, 1200]} />
    </div>
  );
};

export default ParameterSelectors;
