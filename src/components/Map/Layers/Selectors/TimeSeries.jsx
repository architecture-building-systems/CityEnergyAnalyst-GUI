import { Slider } from 'antd';
import { useMapStore } from '../../store/store';

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

const TimeSeriesSelector = ({ parameterName, value, defaultValue = 12 }) => {
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (value) => {
    setMapLayerParameters((prev) => ({ ...prev, [parameterName]: value }));
  };

  return (
    <div style={{ padding: 8 }}>
      <div>
        <b>Time Period</b>
      </div>
      <Slider
        defaultValue={value ?? defaultValue}
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

export default TimeSeriesSelector;
