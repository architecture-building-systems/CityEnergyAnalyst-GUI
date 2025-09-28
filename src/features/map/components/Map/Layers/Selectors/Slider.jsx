import { Slider } from 'antd';
import { useMapStore } from 'features/map/stores/mapStore';
import { useEffect, useState } from 'react';
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

const SliderSelector = ({
  parameterName,
  label,
  value,
  defaultValue,
  onChange,
  layerName,
  range: staticRange = [0, 100],
}) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const categoryInfo = useMapStore((state) => state.selectedMapCategory);

  const [sliderValue, setSliderValue] = useState(value ?? defaultValue);
  const [dynamicRange, setDynamicRange] = useState(staticRange || [0, 100]);

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

  // Fetch dynamic range if this parameter has an options_generator
  useEffect(() => {
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
        if (
          Array.isArray(rangeData) &&
          rangeData.length === 2 &&
          typeof rangeData[0] === 'number' &&
          typeof rangeData[1] === 'number'
        ) {
          setDynamicRange(rangeData);

          // Set default value to the full range if no value is set
          if (
            !sliderValue ||
            (Array.isArray(sliderValue) &&
              sliderValue[0] === 0 &&
              sliderValue[1] === 0)
          ) {
            const newDefaultValue = Array.isArray(defaultValue)
              ? rangeData
              : rangeData[0];
            setSliderValue(newDefaultValue);
            handleChange(newDefaultValue);
          }
        } else {
          console.warn('Invalid range data received:', rangeData);
          setDynamicRange(staticRange || [0, 100]);
        }
      } catch (error) {
        console.error('Failed to fetch range:', error.response?.data);
        setDynamicRange(staticRange);
      }
    };

    if (categoryInfo?.name && layerName && project && scenarioName) {
      fetchRange();
    }
  }, [categoryInfo?.name, layerName, project, scenarioName]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <b>{label || 'Range'}</b>
        <div>
          [
          {Array.isArray(sliderValue)
            ? `${sliderValue[0]} - ${sliderValue[1]}`
            : sliderValue}
          ]
        </div>
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12 }}>
        <Slider
          value={sliderValue}
          defaultValue={defaultValue}
          range={Array.isArray(defaultValue) ? { draggableTrack: true } : false}
          min={dynamicRange?.[0] ?? 0}
          max={dynamicRange?.[1] ?? 100}
          onChange={handleSliderChange}
          onChangeComplete={handleChange}
          tooltip={{
            placement: 'bottom',
          }}
        />
      </div>
    </div>
  );
};

export default SliderSelector;
