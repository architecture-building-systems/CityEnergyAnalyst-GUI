import { Slider } from 'antd';
import { useMapStore } from 'features/map/stores/mapStore';
import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';

const getRange = async (
  layerCategory,
  layerName,
  parameterName,
  project,
  scenarioName,
  parameters,
) => {
  const resp = await apiClient.post(
    `/api/map_layers/${layerCategory}/${layerName}/${parameterName}/range`,
    {
      project,
      scenario_name: scenarioName,
      parameters,
    },
  );
  return resp.data;
};

const checkIsValidRange = (range) => {
  return (
    Array.isArray(range) &&
    range.length === 2 &&
    typeof range[0] === 'number' &&
    typeof range[1] === 'number' &&
    range[0] <= range[1]
  );
};

const generateTenMarks = (min, max) => {
  const marks = {};
  const firstTen = Math.ceil(min / 10) * 10;

  for (let i = firstTen; i <= max; i += 10) {
    marks[i] = i.toString();
  }

  return marks;
};

const SliderSelector = ({
  parameterName,
  label,
  value,
  defaultValue,
  onChange,
  layerName,
  range: staticRange,
}) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const categoryInfo = useMapStore((state) => state.selectedMapCategory);

  const [sliderValue, setSliderValue] = useState(value ?? defaultValue);
  const [dynamicRange, setDynamicRange] = useState();
  const min = staticRange?.[0] ?? dynamicRange?.[0] ?? null;
  const max = staticRange?.[1] ?? dynamicRange?.[1] ?? null;

  const marks = useMemo(() => {
    if (checkIsValidRange([min, max])) {
      return generateTenMarks(min, max);
    }
    return {};
  }, [min, max]);

  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const handleChange = (newValue) => {
    setSliderValue(newValue);
    setMapLayerParameters((prev) => ({
      ...prev,
      [parameterName]: newValue,
    }));
    onChange?.(newValue);
  };

  const handleSliderChange = (newValue) => {
    setSliderValue(newValue);
  };

  // Fetch dynamic range only if static range is not provided
  useEffect(() => {
    // If static range is provided, use it and don't fetch from backend
    if (staticRange && Array.isArray(staticRange) && staticRange.length === 2) {
      setDynamicRange(staticRange);
      return;
    }

    // Only fetch range if no static range is provided (dynamic range case)
    const fetchRange = async () => {
      try {
        const rangeData = await getRange(
          categoryInfo?.name,
          layerName,
          parameterName,
          project,
          scenarioName,
          mapLayerParameters ?? {},
        );

        // Validate range data before using it
        if (checkIsValidRange(rangeData)) {
          setDynamicRange(rangeData);
          // Set new value to be full range of new data
          handleChange(rangeData);
        } else {
          console.warn('Invalid range data received:', rangeData);
          setDynamicRange(null);
        }
      } catch (error) {
        console.error('Failed to fetch range:', error.response?.data);
        setDynamicRange(null);
      }
    };

    if (categoryInfo?.name && layerName && project && scenarioName) {
      fetchRange();
    }
  }, [categoryInfo?.name, layerName, project, scenarioName, staticRange]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>{label || 'Range'}</b>
        <div>
          [
          {checkIsValidRange(sliderValue)
            ? `${sliderValue[0]} - ${sliderValue[1]}`
            : '--'}
          ]
        </div>
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12 }}>
        <Slider
          value={sliderValue}
          defaultValue={defaultValue}
          range={{ draggableTrack: true }}
          min={min}
          max={max}
          onChange={handleSliderChange}
          onChangeComplete={handleChange}
          tooltip={{
            placement: 'bottom',
          }}
          marks={marks}
          disabled={checkIsValidRange([min, max]) === false}
        />
      </div>
    </div>
  );
};

export default SliderSelector;
