import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threhold';
import { useMemo } from 'react';
import { useMapStore } from '../../store/store';
import ChoiceSelector from './Choice';
import { ConfigProvider } from 'antd';
import InputSelector from './Input';

const ParameterSelectors = ({ layers, parameterValues }) => {
  const range = useMapStore((state) => state.range);
  const filter = useMapStore((state) => state.filter);

  const _parameters = useMemo(
    () =>
      layers.map((layer) => {
        const { name, parameters } = layer;
        return (
          <div
            key={name}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {Object.entries(parameters).map(([key, parameter]) => {
              const { default: defaultValue, selector, label } = parameter;

              switch (selector) {
                case 'time-series':
                  return (
                    <TimeSeriesSelector
                      key={`${name}-${key}`}
                      parameterName={key}
                      value={parameterValues?.[key]}
                      defaultValue={defaultValue}
                    />
                  );
                case 'threshold':
                  return (
                    <ThresholdSelector
                      key={`${name}-${key}`}
                      parameterName={key}
                      value={filter}
                      defaultValue={defaultValue}
                      range={range}
                      label={label}
                    />
                  );
                case 'choice': {
                  const { choices } = parameter;
                  return (
                    <ChoiceSelector
                      key={`${name}-${key}`}
                      parameterName={key}
                      value={parameterValues?.[key]}
                      defaultValue={defaultValue}
                      choices={choices}
                    />
                  );
                }
                case 'input': {
                  const { type } = parameter;
                  return (
                    <InputSelector
                      key={`${name}-${key}`}
                      parameterName={key}
                      value={parameterValues?.[key]}
                      defaultValue={defaultValue}
                      type={type}
                    />
                  );
                }
                default:
                  if (selector) {
                    return (
                      <div key={`${name}-${key}`} style={{ paddding: 12 }}>
                        Unknown parameter type: {selector}
                      </div>
                    );
                  }
              }
            })}
          </div>
        );
      }),
    [layers, parameterValues, range, filter],
  );

  if (!parameterValues) return null;

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
        {_parameters?.length > 0 ? _parameters : <div>No parameters found</div>}
      </div>
    </ConfigProvider>
  );
};

export default ParameterSelectors;
