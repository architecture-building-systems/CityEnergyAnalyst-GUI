import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threshold';
import SliderSelector from './Slider';
import { useMemo, useCallback, useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import ChoiceSelector from './Choice';
import { ConfigProvider } from 'antd';
import { InputSelector, InputNumberSelector } from './Input';

// Filters rendered inside the Legend card instead of the parameters panel.
const LEGEND_FILTERS = new Set(['scale', 'radius']);

const ParameterSelectors = ({ layers, parameterValues }) => {
  const range = useMapStore((state) => state.range);
  const filters = useMapStore((state) => state.filters);

  const setMapLayerParameters = useMapStore(
    (state) => state.setMapLayerParameters,
  );
  const setFilters = useMapStore((state) => state.setFilters);

  const changeHandler = useCallback(
    (parameterName, filter) => {
      if (filter) {
        return (value) => setFilters(filter, value);
      } else {
        return (value) => {
          setMapLayerParameters((prev) => ({
            ...(prev ?? {}),
            [parameterName]: value,
          }));
        };
      }
    },
    [setFilters, setMapLayerParameters],
  );

  const parameterChangeHandlers = useMemo(() => {
    if (!layers) return {};

    const handlers = {};
    layers.forEach((layer) => {
      Object.entries(layer.parameters).forEach(([key, parameter]) => {
        const handlerKey = `${layer.name}:${key}`;
        handlers[handlerKey] = changeHandler(key, parameter?.filter);
      });
    });

    return handlers;
  }, [layers, changeHandler]);

  // Set the filters to the default values
  useEffect(() => {
    if (!layers) return;

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

  const _parameters = useMemo(() => {
    if (!layers) return [];

    return layers.map((layer) => {
      const { name, parameters } = layer;

      const rendered = [];
      Object.entries(parameters).forEach(([key, parameter]) => {
        const { default: defaultValue, selector, label, filter } = parameter;

        // Scale/radius are rendered inside the Legend card.
        if (filter && LEGEND_FILTERS.has(filter)) return;

        const value = filter ? filters?.[filter] : parameterValues?.[key];
        const _handleChange = parameterChangeHandlers[`${name}:${key}`];

        let element = null;
        switch (selector) {
          case 'time-series':
            element = (
              <TimeSeriesSelector
                key={`${name}-${key}`}
                parameterName={key}
                value={value}
                defaultValue={defaultValue}
                onChange={_handleChange}
              />
            );
            break;
          case 'threshold':
            element = (
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
            break;
          case 'slider': {
            const { range: sliderRange, depends_on } = parameter;
            element = (
              <SliderSelector
                key={`${name}-${key}`}
                parameterName={key}
                label={label}
                value={value}
                defaultValue={defaultValue}
                range={sliderRange}
                layerName={name}
                dependsOn={depends_on}
                onChange={_handleChange}
              />
            );
            break;
          }
          case 'choice': {
            const { depends_on, multi } = parameter;
            element = (
              <ChoiceSelector
                key={`${name}-${key}`}
                parameterName={key}
                label={label}
                value={value}
                defaultValue={defaultValue}
                onChange={_handleChange}
                layerName={name}
                dependsOn={depends_on}
                multi={!!multi}
              />
            );
            break;
          }
          case 'input': {
            const { type } = parameter;
            if (type === 'string') {
              element = (
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
              const { range: inputRange } = parameter;
              element = (
                <InputNumberSelector
                  key={`${name}-${key}`}
                  parameterName={key}
                  label={label}
                  value={value}
                  defaultValue={defaultValue}
                  range={inputRange}
                  onChange={_handleChange}
                />
              );
            }
            break;
          }
          default:
            if (selector) {
              element = (
                <div key={`${name}-${key}`} style={{ padding: 12 }}>
                  Unknown parameter type: {selector}
                </div>
              );
            }
        }

        if (element) rendered.push({ selector, element });
      });

      // Group consecutive 'choice' selectors into a single flex row so related
      // dropdowns (e.g. what-if-name + emission/category) sit side-by-side.
      // A pair of choice selectors gets a golden-ratio split (0.618 : 1)
      // so the second (typically the richer "value" selector) is wider.
      const GOLDEN = 0.618;
      const groups = [];
      let choiceRun = [];
      const flushChoiceRun = () => {
        if (choiceRun.length === 0) return;
        if (choiceRun.length === 1) {
          groups.push(choiceRun[0]);
        } else {
          const ratios =
            choiceRun.length === 2 ? [GOLDEN, 1] : choiceRun.map(() => 1);
          groups.push(
            <div
              key={`${name}-choice-row-${groups.length}`}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {choiceRun.map((el, i) => (
                <div
                  key={el.key ?? i}
                  style={{
                    flex: ratios[i],
                    minWidth: 0,
                    display: 'flex',
                  }}
                >
                  {el}
                </div>
              ))}
            </div>,
          );
        }
        choiceRun = [];
      };
      rendered.forEach(({ selector: s, element }) => {
        if (s === 'choice') {
          choiceRun.push(element);
        } else {
          flushChoiceRun();
          groups.push(element);
        }
      });
      flushChoiceRun();

      return (
        <div
          key={name}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {groups}
        </div>
      );
    });
  }, [layers, parameterValues, range, filters, parameterChangeHandlers]);

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
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '0 12px 12px 12px',
          fontSize: 12,
          gap: 2,
        }}
      >
        {_parameters?.length > 0 ? _parameters : <div>No parameters found</div>}
      </div>
    </ConfigProvider>
  );
};

export default ParameterSelectors;
