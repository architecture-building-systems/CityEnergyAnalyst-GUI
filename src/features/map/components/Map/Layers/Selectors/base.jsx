import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threshold';
import SliderSelector from './Slider';
import { useMemo, useCallback, useEffect } from 'react';
import {
  useMapStore,
  useSelectedMapLayer,
  useSetSelectedMapLayer,
} from 'features/map/stores/mapStore';
import ChoiceSelector from './Choice';
import { ConfigProvider, Select } from 'antd';
import { InputSelector, InputNumberSelector } from './Input';

const ParameterSelectors = ({ layers, parameterValues, onLayerSelect }) => {
  const selectedLayer = useSelectedMapLayer();
  const setSelectedLayer = useSetSelectedMapLayer();

  const range = useMapStore((state) => state.range);
  const filters = useMapStore((state) => state.filters);

  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );
  const setFilters = useMapStore((state) => state.setFilters);

  const handleLayerSelected = (layerName) => {
    setSelectedLayer(layerName);
    if (onLayerSelect) onLayerSelect?.(layerName);
  };

  const changeHandler = useCallback(
    (parameterName, filter) => {
      if (filter) {
        return (value) => setFilters(filter, value);
      } else {
        return (value) => {
          setMapLayerParameters((prev) => ({
            ...prev,
            [parameterName]: value,
          }));
        };
      }
    },
    [setFilters, setMapLayerParameters],
  );

  // Set the filters to the default values
  useEffect(() => {
    layers.map((layer) => {
      const { parameters } = layer;
      Object.entries(parameters).forEach(([, parameter]) => {
        const { filter, default: defaultValue } = parameter;
        if (filter && !filters?.[filter]) {
          setFilters(filter, defaultValue);
        }
      });
    });
  }, [layers]);

  // When layers change, check if the selected layer is still valid
  // If not, select the first layer
  useEffect(() => {
    if (!layers?.length) {
      setSelectedLayer(null);
      return;
    }

    if (!selectedLayer || !layers.find((l) => l.name === selectedLayer)) {
      handleLayerSelected(layers[0].name);
    }
  }, [layers, selectedLayer]);

  const _parameters = useMemo(() => {
    const filteredLayers = selectedLayer
      ? layers.filter((layer) => layer.name === selectedLayer)
      : layers;

    return filteredLayers.map((layer) => {
      const { name, parameters } = layer;

      return (
        <div
          key={name}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {Object.entries(parameters).map(([key, parameter]) => {
            const {
              default: defaultValue,
              selector,
              label,
              filter,
            } = parameter;

            const value = filter ? filters?.[filter] : parameterValues?.[key];
            const _handleChange = changeHandler(key, filter);

            switch (selector) {
              case 'time-series':
                return (
                  <TimeSeriesSelector
                    key={`${name}-${key}`}
                    parameterName={key}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={_handleChange}
                  />
                );
              case 'threshold':
                return (
                  <ThresholdSelector
                    key={`${name}-${key}`}
                    parameterName={key}
                    value={value}
                    defaultValue={defaultValue}
                    range={range}
                    label={label}
                    onChange={_handleChange}
                  />
                );
              case 'slider': {
                const { range } = parameter;
                return (
                  <SliderSelector
                    key={`${name}-${key}`}
                    parameterName={key}
                    label={label}
                    value={value}
                    defaultValue={defaultValue}
                    range={range}
                    layerName={name}
                    onChange={_handleChange}
                  />
                );
              }
              case 'choice': {
                const { depends_on } = parameter;
                return (
                  <ChoiceSelector
                    key={`${name}-${key}`}
                    parameterName={key}
                    label={label}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={_handleChange}
                    layerName={name}
                    dependsOn={depends_on}
                  />
                );
              }
              case 'input': {
                const { type } = parameter;

                if (type === 'string') {
                  return (
                    <InputSelector
                      key={`${name}-${key}`}
                      parameterName={key}
                      label={label}
                      value={value}
                      defaultValue={defaultValue}
                      onChange={_handleChange}
                    />
                  );
                } else if (type === 'number') {
                  const { range } = parameter;
                  return (
                    <InputNumberSelector
                      key={`${name}-${key}`}
                      parameterName={key}
                      label={label}
                      value={value}
                      defaultValue={defaultValue}
                      range={range}
                      onChange={_handleChange}
                    />
                  );
                } else return null;
              }
              default:
                if (selector) {
                  return (
                    <div key={`${name}-${key}`} style={{ padding: 12 }}>
                      Unknown parameter type: {selector}
                    </div>
                  );
                }
            }
          })}
        </div>
      );
    });
  }, [layers, selectedLayer, parameterValues, range, filters, changeHandler]);

  return (
    <ConfigProvider
      theme={{
        components: {
          Slider: {
            trackBg: 'black',
            trackHoverBg: 'gray',
            handleColor: 'black',
            dotActiveBorderColor: 'black',
            fontSize: 12,
          },
        },
      }}
    >
      <div
        className="cea-overlay-card"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 12,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

          display: 'flex',
          flexDirection: 'column',

          padding: 12,
          width: '100%',

          fontSize: 12,

          gap: 2,
        }}
      >
        {layers.length > 1 && (
          <Select
            style={{ marginBottom: 8 }}
            placeholder="Select a layer"
            value={selectedLayer}
            onChange={handleLayerSelected}
            options={layers.map((layer) => ({
              label: layer.label,
              value: layer.name,
            }))}
          />
        )}
        {_parameters?.length > 0 ? _parameters : <div>No parameters found</div>}
      </div>
    </ConfigProvider>
  );
};

export default ParameterSelectors;
