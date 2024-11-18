import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threhold';
import { useMemo } from 'react';
import { useMapStore } from '../../store/store';

const ParameterSelectors = ({ layers, parameterValues }) => {
  const range = useMapStore((state) => state.range);
  const filter = useMapStore((state) => state.filter);

  const _parameters = useMemo(
    () =>
      layers.map((layer) => {
        const { name, parameters } = layer;
        return (
          <div key={name}>
            {Object.entries(parameters).map(([key, parameter]) => {
              const { default: defaultValue, selector } = parameter;

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
                    />
                  );
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
    <div
      className="cea-overlay-card"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        display: 'flex',
        flexDirection: 'column',

        padding: 2,
        width: '100%',

        fontSize: 12,

        gap: 2,
      }}
    >
      {_parameters?.length > 0 ? _parameters : <div>No parameters found</div>}
    </div>
  );
};

export default ParameterSelectors;
