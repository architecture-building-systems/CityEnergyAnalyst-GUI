import { Slider } from 'antd';
import { useMapStore } from 'features/map/stores/mapStore';
import { useSelectedMapCategoryInfo } from 'features/project/components/Cards/MapLayersCard/store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from 'features/project/stores/projectStore';
import { apiClient } from 'lib/api/axios';
import useDependsOn from './useDependsOn';

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

const isSameRange = (a, b) => {
  return (
    checkIsValidRange(a) &&
    checkIsValidRange(b) &&
    a[0] === b[0] &&
    a[1] === b[1]
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
  dependsOn,
}) => {
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const mapLayerParameters = useMapStore((state) => state.mapLayerParameters);
  const categoryInfo = useSelectedMapCategoryInfo();
  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );

  const [sliderValue, setSliderValue] = useState(value ?? defaultValue);
  const [dynamicRange, setDynamicRange] = useState();
  const mapLayerParametersRef = useRef(mapLayerParameters);
  const onChangeRef = useRef(onChange);
  const min = staticRange?.[0] ?? dynamicRange?.[0] ?? null;
  const max = staticRange?.[1] ?? dynamicRange?.[1] ?? null;

  useEffect(() => {
    mapLayerParametersRef.current = mapLayerParameters;
  }, [mapLayerParameters]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const marks = useMemo(() => {
    if (checkIsValidRange([min, max])) {
      return generateTenMarks(min, max);
    }
    return {};
  }, [min, max]);

  const { dependsOnValues, dependsValid } = useDependsOn(
    dependsOn,
    mapLayerParameters,
  );

  const handleChange = useCallback(
    (newValue) => {
      setSliderValue(newValue);
      setMapLayerParameters((prev) => ({
        ...(prev ?? {}),
        [parameterName]: newValue,
      }));
      onChange?.(newValue);
    },
    [onChange, parameterName, setMapLayerParameters],
  );

  const handleSliderChange = (newValue) => {
    setSliderValue(newValue);
  };

  // Fetch dynamic range only if static range is not provided
  useEffect(() => {
    // If static range is provided, skip dynamic fetch
    if (staticRange && Array.isArray(staticRange) && staticRange.length === 2) {
      return;
    }

    // Wait until all dependent params have been set
    if (!dependsValid) return;

    const fetchRange = async () => {
      try {
        const rangeData = await getRange(
          categoryInfo?.name,
          layerName,
          parameterName,
          project,
          scenarioName,
          mapLayerParametersRef.current ?? {},
        );

        if (checkIsValidRange(rangeData)) {
          setDynamicRange((prev) =>
            isSameRange(prev, rangeData) ? prev : rangeData,
          );

          const currentParameterValue =
            mapLayerParametersRef.current?.[parameterName];
          const shouldApplyFetchedRange = !isSameRange(
            currentParameterValue,
            rangeData,
          );

          if (shouldApplyFetchedRange) {
            setSliderValue(rangeData);
            setMapLayerParameters((prev) => {
              const prevValue = prev?.[parameterName];
              if (isSameRange(prevValue, rangeData)) {
                return prev;
              }

              return {
                ...(prev ?? {}),
                [parameterName]: rangeData,
              };
            });
            onChangeRef.current?.(rangeData);
          }
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
  }, [
    categoryInfo?.name,
    layerName,
    parameterName,
    project,
    scenarioName,
    staticRange,
    dependsOnValues,
    dependsValid,
    setMapLayerParameters,
  ]);

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
