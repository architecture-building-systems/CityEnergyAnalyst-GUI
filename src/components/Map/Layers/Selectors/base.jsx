import TimeSeriesSelector from './TimeSeries';
import ThresholdSelector from './Threhold';
import { useMemo } from 'react';

const ParameterSelectors = ({ layers }) => {
  const parameters = useMemo(
    () =>
      layers.map((layer) => {
        const { name, parameters } = layer;
        return (
          <div key={name}>
            {Object.entries(parameters).map(([key, parameter]) => {
              const { name, default: defaultValue, selector } = parameter;

              switch (selector) {
                case 'time-series':
                  return (
                    <TimeSeriesSelector
                      key={`${name}-${key}`}
                      parameterName={name}
                      defaultValue={defaultValue}
                    />
                  );
                case 'threshold':
                  return (
                    <ThresholdSelector
                      key={`${name}-${key}`}
                      parameterName={name}
                      defaultValue={defaultValue}
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
    [layers],
  );

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
      {parameters?.length > 0 ? parameters : <div>No parameters found</div>}
    </div>
  );
};

export default ParameterSelectors;
