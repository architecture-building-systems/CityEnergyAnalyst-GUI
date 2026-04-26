import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threshold';
import SliderSelector from './Slider';
import { useMemo, useCallback, useEffect } from 'react';
import { useMapStore } from 'features/map/stores/mapStore';
import { useScopedSetMapLayerParameters } from 'features/reports/components/mapInstance';
import ChoiceSelector from './Choice';
import { ConfigProvider } from 'antd';
import { InputSelector, InputNumberSelector } from './Input';

// Filters rendered inside the Legend card instead of the parameters panel.
const LEGEND_FILTERS = new Set(['scale', 'radius']);

/**
 * @param allowParamKeys Optional filter for `choice` (dropdown)
 *   selectors. Can be an array of exact keys, OR a predicate
 *   `(key) => boolean`. Non-choice selectors always render. `null` /
 *   `undefined` = render everything (main viewport default).
 */
const ParameterSelectors = ({ layers, parameterValues, allowParamKeys }) => {
  const isAllowedChoiceKey = useMemo(() => {
    if (!allowParamKeys) return () => true;
    if (typeof allowParamKeys === 'function') return allowParamKeys;
    if (Array.isArray(allowParamKeys))
      return (key) => allowParamKeys.includes(key);
    return () => true;
  }, [allowParamKeys]);
  const range = useMapStore((state) => state.range);
  const filters = useMapStore((state) => state.filters);

  const setMapLayerParameters = useScopedSetMapLayerParameters();
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

        // Caller-side allowlist only applies to `choice` (dropdown)
        // selectors — timescale / sliders / inputs always render.
        // Main viewport passes no allowlist, so this is a no-op there.
        if (selector === 'choice' && !isAllowedChoiceKey(key)) return;

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

        if (element) rendered.push({ selector, element, paramKey: key });
      });

      // Group consecutive 'choice' selectors into a single flex row so related
      // dropdowns (e.g. what-if-name + emission/category) sit side-by-side.
      //
      // Width rules per parameter key (smaller flex = narrower column).
      // Keys not in this map default to 1. A pair of "default" selectors
      // still gets a golden-ratio split (0.618 : 1) so the second (the
      // richer "value" selector) is wider.
      const CHOICE_FLEX_OVERRIDES = {
        // `category` for Operational Emissions is short text
        // (`operation` / `energy_carrier`) so give it a small fixed flex.
        category: 0.5,
      };
      const GOLDEN = 0.618;
      const groups = [];
      let choiceRun = [];
      const flushChoiceRun = () => {
        if (choiceRun.length === 0) return;
        if (choiceRun.length === 1) {
          groups.push(choiceRun[0].element);
        } else {
          const hasOverride = choiceRun.some(
            (c) => CHOICE_FLEX_OVERRIDES[c.paramKey] != null,
          );
          let ratios;
          if (hasOverride) {
            ratios = choiceRun.map((c) =>
              CHOICE_FLEX_OVERRIDES[c.paramKey] != null
                ? CHOICE_FLEX_OVERRIDES[c.paramKey]
                : 1,
            );
          } else if (choiceRun.length === 2) {
            ratios = [GOLDEN, 1];
          } else {
            ratios = choiceRun.map(() => 1);
          }
          groups.push(
            <div
              key={`${name}-choice-row-${groups.length}`}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {choiceRun.map((c, i) => (
                <div
                  key={c.element.key ?? i}
                  style={{
                    flex: ratios[i],
                    minWidth: 0,
                    display: 'flex',
                  }}
                >
                  {c.element}
                </div>
              ))}
            </div>,
          );
        }
        choiceRun = [];
      };
      // Selectors that get a grey divider above them when they follow a
      // choice row — gives the map layer card a clear visual split
      // between "what to show" (dropdowns) and "when" (timeline/slider).
      const DIVIDED_SELECTORS = new Set(['time-series', 'slider']);
      const dividerFor = (key) => (
        <div
          key={key}
          style={{
            height: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            margin: '6px 0',
          }}
        />
      );
      let hasEmittedChoice = false;
      rendered.forEach(({ selector: s, element, paramKey }) => {
        if (s === 'choice') {
          choiceRun.push({ element, paramKey });
          return;
        }
        const hadChoiceBefore = hasEmittedChoice || choiceRun.length > 0;
        if (choiceRun.length > 0) {
          hasEmittedChoice = true;
        }
        flushChoiceRun();
        if (hadChoiceBefore && DIVIDED_SELECTORS.has(s)) {
          groups.push(dividerFor(`${name}-divider-${groups.length}`));
        }
        groups.push(element);
      });
      if (choiceRun.length > 0) {
        hasEmittedChoice = true;
      }
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
  }, [
    layers,
    parameterValues,
    range,
    filters,
    parameterChangeHandlers,
    isAllowedChoiceKey,
  ]);

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
          fontSize: 13,
          gap: 2,
        }}
      >
        {_parameters?.length > 0 ? _parameters : <div>No parameters found</div>}
      </div>
    </ConfigProvider>
  );
};

export default ParameterSelectors;
