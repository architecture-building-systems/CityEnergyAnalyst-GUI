import { Button, Slider } from 'antd';
import { useMapStore } from '../../store/store';
import { useMemo, useState } from 'react';

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

const Checkbox = ({ value, label, initialChecked = false, onChange }) => {
  const [isChecked, setIsChecked] = useState(initialChecked);

  const handleCheckboxChange = () => {
    onChange?.(!isChecked); // Pass the new checked state to the parent
    setIsChecked((prev) => !prev);
  };

  return (
    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={value ?? isChecked}
        onChange={handleCheckboxChange}
        style={{ marginRight: 8 }}
      />
      {label}
    </label>
  );
};

const TimeSeriesSelector = ({ parameterName, value, defaultValue = 12 }) => {
  const [period, setPeriod] = useState(value);
  const min = 1;
  const max = 365;

  const inverted = value?.[0] > value?.[1];
  const wholePeriodSelected = value?.[0] === min && value?.[1] === max;

  const marks = useMemo(() => {
    const _marks = {};
    months.forEach((month, index) => {
      _marks[getNthDayOfMonth[index]] = {
        style: {
          color: '#0008',
        },
        label: month,
      };
    });
    return _marks;
  }, []);

  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (value) => {
    setMapLayerParameters((prev) => ({
      ...prev,
      [parameterName]: value,
    }));
  };

  const handleSelectEntirePeriod = () => {
    const newValue = [min, max];
    setPeriod(newValue);
    handleChange(newValue);
  };

  const handleInvertSelection = () => {
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
            'to',
            dayToDateTime(value?.[1]),
            '23:00',
          ].join(' ')}
          ]
        </div>
        {inverted
          ? `${365 + (value?.[1] - value?.[0]) + 1} days`
          : `${value?.[1] - value?.[0] + 1} days`}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 8,
          }}
        >
          {!wholePeriodSelected && (
            <Button
              style={{ fontSize: 12 }}
              size="small"
              onClick={handleSelectEntirePeriod}
            >
              Select Entire Year
            </Button>
          )}

          <Checkbox
            label="Invert Date Selection"
            initialChecked={false}
            value={inverted}
            onChange={handleInvertSelection}
          />
        </div>
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12 }}>
        <Slider
          value={period}
          defaultValue={defaultValue}
          range={{ draggableTrack: true }}
          min={min}
          max={max}
          onChange={(value) => setPeriod(value)}
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
