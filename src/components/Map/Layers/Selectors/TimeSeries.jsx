import { Slider } from 'antd';
import { useMapStore } from '../../store/store';
import { useEffect, useMemo, useState } from 'react';

const dayToDateTime = (dayOfYear, year = 2023) => {
  // Start from January 1st of the given year
  const startOfYear = new Date(year, 0, 1);

  // Add the days (subtract 1 since dayOfYear is 1-based)
  const date = new Date(
    startOfYear.getTime() + (dayOfYear - 1) * 24 * 60 * 60 * 1000,
  );

  const formattedDate = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  return formattedDate;
};

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const getNthDayOfMonth = [
  1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335,
];

const Checkbox = ({ label, initialChecked = false, onChange }) => {
  const [isChecked, setIsChecked] = useState(initialChecked);

  const handleCheckboxChange = () => {
    onChange?.(!isChecked); // Pass the new checked state to the parent
    setIsChecked((prev) => !prev);
  };

  return (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleCheckboxChange}
        style={{ marginRight: 8 }}
      />
      {label}
    </label>
  );
};

const TimeSeriesSelector = ({ parameterName, value, defaultValue = 12 }) => {
  const [invertSelection, setInvertSelection] = useState(false);

  const min = 1;
  const max = 365;

  const marks = useMemo(() => {
    const _marks = {};
    months.forEach((month, index) => {
      _marks[getNthDayOfMonth[index]] = month;
    });
    return _marks;
  }, []);

  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (value) => {
    setMapLayerParameters((prev) => ({
      ...prev,
      [parameterName]: invertSelection ? [value?.[1], value?.[0]] : value,
    }));
  };

  const handleInvertSelection = (invert) => {
    setInvertSelection(invert);
    handleChange([value?.[1], value?.[0]]);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>Time Period</b>
        <div>
          [
          {[
            dayToDateTime(value?.[0]),
            '00:00',
            '-',
            dayToDateTime(value?.[1]),
            '23:00',
          ].join(' ')}
          ]
        </div>
        {invertSelection
          ? `${365 + (value?.[1] - value?.[0]) + 1} days`
          : `${value?.[1] - value?.[0] + 1} days`}
        <div style={{ marginLeft: 'auto' }}>
          <Checkbox
            label="Invert Date Selection"
            initialChecked={invertSelection}
            onChange={handleInvertSelection}
          />
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <Slider
          defaultValue={value ?? defaultValue}
          range={{ draggableTrack: true }}
          min={min}
          max={max}
          onChangeComplete={handleChange}
          tooltip={{
            formatter: (value) => dayToDateTime(value),
          }}
          marks={marks}
        />
      </div>
    </div>
  );
};

export default TimeSeriesSelector;
