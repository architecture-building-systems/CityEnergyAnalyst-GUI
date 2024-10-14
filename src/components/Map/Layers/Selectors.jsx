import { useEffect } from 'react';
import { useMapStore } from '../store/store';
import { Slider } from 'antd';

const hourOfYearToDateTime = (year, hourOfYear) => {
  // Start from January 1st of the given year at midnight
  const startOfYear = new Date(year, 0, 1, 0, 0, 0);

  // Convert hours to milliseconds (1 hour = 60 minutes * 60 seconds * 1000 ms)
  const milliseconds = hourOfYear * 60 * 60 * 1000;

  // Add the milliseconds to the start of the year
  const date = new Date(startOfYear.getTime() + milliseconds);

  const formattedDate = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formattedDate;
};

export const TimeSeriesSelector = ({ parameterName, defaultValue = 12 }) => {
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (value) => {
    setMapLayerParameters({ [parameterName]: value });
  };

  return (
    <div style={{ padding: 8 }}>
      <div>
        <b>Time Period</b>
      </div>
      <Slider
        defaultValue={defaultValue}
        min={0}
        max={8760 - 1}
        onChangeComplete={handleChange}
        tooltip={{
          open: true,
          formatter: (value) => hourOfYearToDateTime(2023, value + 1),
        }}
      />
    </div>
  );
};

export const ThresholdSelector = ({ parameterName, defaultValue }) => {
  const setFilter = useMapStore((state) => state.setFilter);
  const mapLayerParameter = useMapStore((state) => state.MapLayerParameter);

  const handleChange = (value) => {
    setFilter(value);
  };

  return (
    <div style={{ padding: 8 }}>
      <div>
        <b>Threshold</b>
      </div>
      <Slider
        max={1200}
        defaultValue={defaultValue}
        range={{ draggableTrack: true }}
        onChangeComplete={handleChange}
        tooltip={{ open: true }}
      />
    </div>
  );
};

export const ParameterSelectors = () => {
  const selectedMapCategory = useMapStore((state) => state.selectedMapCategory);
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  useEffect(() => {
    if (selectedMapCategory?.layers) {
      let parameters = {};
      for (const layer of selectedMapCategory.layers) {
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
  }, [selectedMapCategory]);

  if (!selectedMapCategory?.layers) return null;

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
      <TimeSeriesSelector parameterName={'hour'} defaultValue={4370} />
      <ThresholdSelector defaultValue={[0, 1200]} />
    </div>
  );
};
